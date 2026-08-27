#!/usr/bin/env python3
"""Validate a normalized marketing-design source capture."""

from __future__ import annotations

import json
import hashlib
import re
import sys
from datetime import datetime
from pathlib import Path

from inspect_images import inspect_image


CASE_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
STATUSES = {"complete", "partial", "flattened", "stale"}
APPROVAL_STATUSES = {"approved-final", "provisional-template", "unreviewed"}
DELIVERY_STATUSES = {"delivered", "not-delivery-evidence", "not-delivered", "unknown"}
REUSE_SCOPES = {"global-aesthetic-reference", "case-pattern", "source-template-only", "not-reusable"}
CLASSIFICATION = {"中文", "互联网", "金融类"}


def fail(message: str) -> None:
    raise ValueError(message)


def find_skill_root(path: Path) -> Path:
    for candidate in (path.parent, *path.parents):
        if (candidate / "SKILL.md").is_file():
            return candidate.resolve()
    fail(f"could not locate SKILL.md above {path}")


def safe_stored_path(root: Path, value: object) -> Path:
    relative = Path(str(value))
    if relative.is_absolute():
        fail(f"stored asset path must be relative: {value}")
    resolved = (root / relative).resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        fail(f"stored asset path escapes the skill folder: {value}")
    return resolved


def require_string_list(value: object, label: str, *, non_empty: bool = False) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        fail(f"{label} must be an array of non-empty strings")
    if non_empty and not value:
        fail(f"{label} must not be empty")
    return value


def validate(path: Path) -> dict[str, object]:
    path = path.expanduser().resolve()
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1:
        fail("schema_version must be 1")

    case_id = data.get("case_id")
    if not isinstance(case_id, str) or not CASE_ID.fullmatch(case_id):
        fail("case_id must use lowercase hyphen-case")

    if not isinstance(data.get("case_name"), str) or not data["case_name"].strip():
        fail("case_name is required")

    classification = data.get("classification")
    if not isinstance(classification, list) or not CLASSIFICATION.issubset(set(classification)):
        fail("classification must include 中文, 互联网, and 金融类")

    status = data.get("capture_status")
    if status not in STATUSES:
        fail(f"capture_status must be one of {sorted(STATUSES)}")

    approval_status = data.get("approval_status")
    if approval_status not in APPROVAL_STATUSES:
        fail(f"approval_status must be one of {sorted(APPROVAL_STATUSES)}")
    delivery_status = data.get("delivery_status")
    if delivery_status not in DELIVERY_STATUSES:
        fail(f"delivery_status must be one of {sorted(DELIVERY_STATUSES)}")
    reuse_scope = data.get("reuse_scope")
    if reuse_scope not in REUSE_SCOPES:
        fail(f"reuse_scope must be one of {sorted(REUSE_SCOPES)}")

    source = data.get("source")
    if not isinstance(source, dict):
        fail("source must be an object")
    for key in ("platform", "capture_mode", "captured_at", "file_name"):
        if not isinstance(source.get(key), str) or not source[key].strip():
            fail(f"source.{key} is required")
    try:
        captured_at = datetime.fromisoformat(source["captured_at"].replace("Z", "+00:00"))
    except ValueError:
        fail("source.captured_at must be an ISO-8601 timestamp")
    if "T" not in source["captured_at"] or captured_at.tzinfo is None:
        fail("source.captured_at must include time and timezone")

    frames = data.get("frames")
    if not isinstance(frames, list):
        fail("frames must be an array")
    if status == "complete" and not frames:
        fail("complete captures require at least one frame")
    if status == "flattened" and not frames:
        fail("flattened captures require at least one frame")

    if status == "partial":
        progress = data.get("capture_progress")
        if not isinstance(progress, dict):
            fail("partial captures require capture_progress")
        require_string_list(progress.get("completed_sections"), "capture_progress.completed_sections", non_empty=True)
        require_string_list(progress.get("pending_sections"), "capture_progress.pending_sections", non_empty=True)
        completed = {item.strip().casefold() for item in progress["completed_sections"]}
        pending = {item.strip().casefold() for item in progress["pending_sections"]}
        if completed & pending:
            fail("capture_progress completed and pending sections must not overlap")
        if not frames and not data.get("stored_assets"):
            fail("partial captures must retain at least one captured frame or asset")

    if status == "stale":
        if not frames and not data.get("stored_assets"):
            fail("stale captures must preserve last-good frames or assets")
        if reuse_scope != "not-reusable":
            fail("stale captures must use reuse_scope=not-reusable")
        if not any(isinstance(note, str) and note.strip() for note in data.get("notes", [])):
            fail("stale captures require a non-empty reason in notes")

    seen_ids: set[str] = set()
    for index, frame in enumerate(frames):
        if not isinstance(frame, dict):
            fail(f"frames[{index}] must be an object")
        for key in ("id", "name", "role"):
            if not isinstance(frame.get(key), str) or not frame[key].strip():
                fail(f"frames[{index}].{key} is required")
        if frame["id"] in seen_ids:
            fail(f"duplicate frame id: {frame['id']}")
        seen_ids.add(frame["id"])
        for key in ("width", "height"):
            value = frame.get(key)
            if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
                fail(f"frames[{index}].{key} must be a positive integer")
        layers = frame.get("layers", [])
        if not isinstance(layers, list):
            fail(f"frames[{index}].layers must be an array")
        layer_count = frame.get("layer_count")
        if not isinstance(layer_count, int) or layer_count < 0:
            fail(f"frames[{index}].layer_count must be a non-negative integer")
        if layer_count != len(layers):
            fail(f"frames[{index}].layer_count does not match layers length")
        if status == "complete" and not layers:
            fail(f"complete capture frame {frame['id']} must include layer data")
        if status == "flattened":
            if layers or layer_count != 0:
                fail(f"flattened capture frame {frame['id']} must have zero editable layers")
            if not isinstance(frame.get("asset"), str) or not frame["asset"].strip():
                fail(f"flattened capture frame {frame['id']} must reference a stored raster asset")

    for key in ("extension_rules", "dynamic_fields", "stored_assets", "unknown_fields", "notes"):
        if not isinstance(data.get(key, []), list):
            fail(f"{key} must be an array")

    stored_assets = data.get("stored_assets", [])
    if status == "flattened" and not stored_assets:
        fail("flattened captures require stored_assets")

    skill_root = find_skill_root(path)
    stored_by_path: dict[str, dict[str, object]] = {}
    stored_by_resolved_path: set[Path] = set()
    for index, asset in enumerate(stored_assets):
        if not isinstance(asset, dict) or not isinstance(asset.get("path"), str) or not asset["path"].strip():
            fail(f"stored_assets[{index}].path is required")
        relative = asset["path"]
        stored_path = safe_stored_path(skill_root, relative)
        if stored_path in stored_by_resolved_path:
            fail(f"duplicate normalized stored asset path: {relative}")
        stored_by_resolved_path.add(stored_path)
        if not stored_path.is_file():
            fail(f"stored asset does not exist: {relative}")
        if status == "flattened":
            for key in ("width", "height", "size_bytes", "sha256"):
                if key not in asset:
                    fail(f"flattened stored asset {relative} requires {key}")
        if "size_bytes" in asset and asset["size_bytes"] != stored_path.stat().st_size:
            fail(f"stored asset size mismatch: {relative}")
        if "sha256" in asset:
            expected_hash = asset["sha256"]
            if not isinstance(expected_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", expected_hash):
                fail(f"stored asset sha256 is invalid: {relative}")
            actual_hash = hashlib.sha256(stored_path.read_bytes()).hexdigest()
            if actual_hash != expected_hash:
                fail(f"stored asset sha256 mismatch: {relative}")
        if stored_path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
            inspected = inspect_image(stored_path)
            suffix_format = "jpeg" if stored_path.suffix.lower() in {".jpg", ".jpeg"} else "png"
            if inspected["format"] != suffix_format:
                fail(f"stored asset extension does not match encoding: {relative}")
            if "width" in asset and inspected["width"] != asset["width"]:
                fail(f"stored asset width mismatch: {relative}")
            if "height" in asset and inspected["height"] != asset["height"]:
                fail(f"stored asset height mismatch: {relative}")
        stored_by_path[relative] = asset

    for index, frame in enumerate(frames):
        asset_path = frame.get("asset")
        if asset_path is None:
            continue
        if asset_path not in stored_by_path:
            fail(f"frames[{index}].asset is not listed in stored_assets")
        stored = stored_by_path[asset_path]
        if stored.get("width") != frame["width"] or stored.get("height") != frame["height"]:
            fail(f"frames[{index}] dimensions do not match its stored asset")

    return {
        "path": str(path.resolve()),
        "case_id": case_id,
        "capture_status": status,
        "approval_status": approval_status,
        "delivery_status": delivery_status,
        "reuse_scope": reuse_scope,
        "frame_count": len(frames),
        "stored_asset_count": len(stored_assets),
        "valid": True,
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: validate_source_capture.py <source-capture.json>", file=sys.stderr)
        return 2
    try:
        result = validate(Path(sys.argv[1]).expanduser())
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"Invalid source capture: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
