#!/usr/bin/env python3
"""Validate the case index and its referenced captures as one library."""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

from validate_source_capture import (
    APPROVAL_STATUSES,
    DELIVERY_STATUSES,
    REUSE_SCOPES,
    STATUSES,
    validate as validate_capture,
)


CASE_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def fail(message: str) -> None:
    raise ValueError(message)


def find_skill_root(path: Path) -> Path:
    for candidate in (path.parent, *path.parents):
        if (candidate / "SKILL.md").is_file():
            return candidate.resolve()
    fail(f"could not locate SKILL.md above {path}")


def safe_path(root: Path, value: object, label: str) -> Path:
    relative = Path(str(value))
    if relative.is_absolute():
        fail(f"{label} must be relative")
    resolved = (root / relative).resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        fail(f"{label} escapes the skill folder")
    if not resolved.is_file():
        fail(f"{label} does not exist: {value}")
    return resolved


def dimensions(value: object, label: str) -> set[tuple[int, int]]:
    if not isinstance(value, list) or not value:
        fail(f"{label} must be a non-empty array")
    result: set[tuple[int, int]] = set()
    for item in value:
        if (
            not isinstance(item, list)
            or len(item) != 2
            or not all(
                isinstance(number, int) and not isinstance(number, bool) and number > 0
                for number in item
            )
        ):
            fail(f"{label} contains an invalid dimension")
        result.add((item[0], item[1]))
    return result


def validate(index_path: Path) -> dict[str, object]:
    index_path = index_path.expanduser().resolve()
    root = find_skill_root(index_path)
    data = json.loads(index_path.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1:
        fail("schema_version must be 1")
    try:
        date.fromisoformat(data.get("updated_at", ""))
    except (TypeError, ValueError):
        fail("updated_at must be an ISO date")
    cases = data.get("cases")
    if not isinstance(cases, list) or not cases:
        fail("cases must be a non-empty array")

    seen_ids: set[str] = set()
    seen_names: dict[str, str] = {}
    indexed_capture_paths: set[Path] = set()
    validated_cases: list[dict[str, object]] = []

    for index, entry in enumerate(cases):
        if not isinstance(entry, dict):
            fail(f"cases[{index}] must be an object")
        case_id = entry.get("case_id")
        if not isinstance(case_id, str) or not CASE_ID.fullmatch(case_id):
            fail(f"cases[{index}].case_id must use lowercase hyphen-case")
        if case_id in seen_ids:
            fail(f"duplicate case_id: {case_id}")
        seen_ids.add(case_id)

        case_name = entry.get("case_name")
        if not isinstance(case_name, str) or not case_name.strip():
            fail(f"{case_id}.case_name is required")
        aliases = entry.get("aliases")
        if not isinstance(aliases, list) or any(not isinstance(alias, str) or not alias.strip() for alias in aliases):
            fail(f"{case_id}.aliases must be an array of non-empty strings")
        tags = entry.get("tags")
        if not isinstance(tags, list) or not {"中文", "互联网", "金融类"}.issubset(set(tags)):
            fail(f"{case_id}.tags must include 中文, 互联网, and 金融类")

        for name in [case_name, *aliases]:
            key = name.strip().casefold()
            owner = seen_names.get(key)
            if owner and owner != case_id:
                fail(f"case name or alias collision: {name!r} belongs to {owner} and {case_id}")
            seen_names[key] = case_id

        if entry.get("capture_status") not in STATUSES:
            fail(f"{case_id}.capture_status is invalid")
        if entry.get("approval_status") not in APPROVAL_STATUSES:
            fail(f"{case_id}.approval_status is invalid")
        if entry.get("delivery_status") not in DELIVERY_STATUSES:
            fail(f"{case_id}.delivery_status is invalid")
        if entry.get("reuse_scope") not in REUSE_SCOPES:
            fail(f"{case_id}.reuse_scope is invalid")

        safe_path(root, entry.get("reference_path"), f"{case_id}.reference_path")
        expected_capture_path = f"assets/cases/{case_id}/source-capture.json"
        if entry.get("capture_path") != expected_capture_path:
            fail(f"{case_id}.capture_path must be {expected_capture_path}")
        capture_path = safe_path(root, entry.get("capture_path"), f"{case_id}.capture_path")
        indexed_capture_paths.add(capture_path)
        capture_result = validate_capture(capture_path)
        capture = json.loads(capture_path.read_text(encoding="utf-8"))

        for key in ("case_id", "case_name", "capture_status", "approval_status", "delivery_status", "reuse_scope"):
            if entry.get(key) != capture.get(key):
                fail(f"{case_id}.{key} does not match its capture")
        if entry.get("captured_at") != capture.get("source", {}).get("captured_at"):
            fail(f"{case_id}.captured_at does not match its capture")
        if entry.get("source_platform") != capture.get("source", {}).get("platform"):
            fail(f"{case_id}.source_platform does not match its capture")
        for index_key, source_key in (("source_file_id", "file_id"), ("source_page_id", "page_id")):
            if index_key in entry and entry[index_key] != capture.get("source", {}).get(source_key):
                fail(f"{case_id}.{index_key} does not match its capture")

        index_dimensions = dimensions(entry.get("frame_dimensions"), f"{case_id}.frame_dimensions")
        capture_dimensions = {
            (int(frame["width"]), int(frame["height"]))
            for frame in capture.get("frames", [])
        }
        if index_dimensions != capture_dimensions:
            fail(f"{case_id}.frame_dimensions do not match its capture")

        validated_cases.append({
            "case_id": case_id,
            "capture_status": capture_result["capture_status"],
            "frame_count": capture_result["frame_count"],
            "stored_asset_count": capture_result["stored_asset_count"],
        })

    discovered_capture_paths = {
        path.resolve()
        for path in (root / "assets" / "cases").glob("*/source-capture.json")
    }
    orphaned_capture_paths = discovered_capture_paths - indexed_capture_paths
    if orphaned_capture_paths:
        orphaned = ", ".join(
            str(path.relative_to(root)) for path in sorted(orphaned_capture_paths)
        )
        fail(f"unindexed source capture(s): {orphaned}")

    return {
        "path": str(index_path),
        "case_count": len(validated_cases),
        "valid": True,
        "cases": validated_cases,
    }


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) == 2 else Path("references/case-library-index.json")
    try:
        result = validate(path)
    except (OSError, json.JSONDecodeError, ValueError, KeyError, TypeError) as error:
        print(f"Invalid case library: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
