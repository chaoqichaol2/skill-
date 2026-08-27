#!/usr/bin/env python3
"""Compare case image exports with manifest dimensions and file-size limits."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from inspect_images import inspect_image


def safe_asset_path(base: Path, value: object) -> Path:
    relative = Path(str(value))
    if relative.is_absolute():
        raise ValueError(f"Asset path must be relative: {value}")
    resolved = (base / relative).resolve()
    try:
        resolved.relative_to(base.resolve())
    except ValueError as error:
        raise ValueError(f"Asset path escapes the case folder: {value}") from error
    return resolved


def normalize_format(value: str) -> str:
    lowered = value.lower().lstrip(".")
    return "jpeg" if lowered in {"jpg", "jpeg"} else lowered


def validate_asset(base: Path, item: dict[str, object]) -> dict[str, object]:
    path = safe_asset_path(base, item["file"])
    actual = inspect_image(path)
    suffix_format = normalize_format(path.suffix)
    formats = [normalize_format(str(value)) for value in item.get("allowed_formats", [])]
    encoding_ok = not formats or actual["format"] in formats
    extension_ok = suffix_format == actual["format"]
    format_ok = encoding_ok and extension_ok
    dimensions_ok = (
        actual["width"] == item["expected_width"]
        and actual["height"] == item["expected_height"]
    )
    file_size_ok = actual["file_size_bytes"] <= item["max_bytes"]
    max_bytes_mode = str(item.get("max_bytes_mode", "required")).lower()
    if max_bytes_mode not in {"required", "recommended"}:
        raise ValueError(f"Invalid max_bytes_mode for {item['file']}: {max_bytes_mode}")
    warnings: list[str] = []
    if max_bytes_mode == "recommended" and not file_size_ok:
        warnings.append(
            f"File exceeds the recommended size by {actual['file_size_bytes'] - item['max_bytes']} bytes."
        )
    passed = dimensions_ok and format_ok and (file_size_ok or max_bytes_mode == "recommended")

    return {
        "slot": item["slot"],
        "file": item["file"],
        "expected": {
            "width": item["expected_width"],
            "height": item["expected_height"],
            "max_bytes": item["max_bytes"],
            "max_bytes_mode": max_bytes_mode,
            "allowed_formats": formats,
        },
        "actual": {
            "width": actual["width"],
            "height": actual["height"],
            "file_size_bytes": actual["file_size_bytes"],
            "format": actual["format"],
            "file_extension": path.suffix.lower(),
            "alpha_channel": actual["alpha_channel"],
        },
        "checks": {
            "dimensions_ok": dimensions_ok,
            "file_size_ok": file_size_ok,
            "format_ok": format_ok,
            "encoding_allowed": encoding_ok,
            "extension_matches_encoding": extension_ok,
        },
        "passed": passed,
        "warnings": warnings,
        "note": item.get("note"),
    }


def validate(manifest_path: Path) -> dict[str, object]:
    """Validate one delivery manifest and return its structured report."""
    manifest_path = manifest_path.expanduser().resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    if not isinstance(assets, list) or not assets:
        raise ValueError("manifest.assets must be a non-empty array")
    if any(not isinstance(item, dict) for item in assets):
        raise ValueError("manifest.assets entries must be objects")
    slots = [str(item["slot"]) for item in assets]
    files = [str(item["file"]) for item in assets]
    if len(slots) != len(set(slots)):
        raise ValueError("manifest contains duplicate slots")
    if len(files) != len(set(files)):
        raise ValueError("manifest contains duplicate files")
    results = [validate_asset(manifest_path.parent, item) for item in assets]
    passed = all(result["passed"] for result in results)
    has_warnings = any(result["warnings"] for result in results)
    return {
        "case": manifest.get("case"),
        "status": "failed" if not passed else "passed_with_warnings" if has_warnings else "passed",
        "passed": passed,
        "assets": results,
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: validate_case_manifest.py <manifest.json>", file=sys.stderr)
        return 2

    try:
        report = validate(Path(sys.argv[1]))
    except (FileNotFoundError, KeyError, TypeError, ValueError, OSError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        return 2
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
