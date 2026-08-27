#!/usr/bin/env python3
"""Inspect PNG dimensions, alpha support, and file size without dependencies."""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def iter_inputs(values: list[str]) -> list[Path]:
    paths: list[Path] = []
    for value in values:
        path = Path(value).expanduser()
        if path.is_dir():
            paths.extend(sorted(p for p in path.rglob("*.png") if p.is_file()))
        elif path.is_file():
            paths.append(path)
        else:
            raise FileNotFoundError(value)
    return paths


def inspect_png(path: Path) -> dict[str, object]:
    with path.open("rb") as handle:
        if handle.read(8) != PNG_SIGNATURE:
            raise ValueError(f"Not a PNG: {path}")
        length = struct.unpack(">I", handle.read(4))[0]
        chunk_type = handle.read(4)
        if chunk_type != b"IHDR" or length != 13:
            raise ValueError(f"Invalid PNG header: {path}")
        width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", handle.read(13))

    return {
        "path": str(path.resolve()),
        "width": width,
        "height": height,
        "bit_depth": bit_depth,
        "color_type": color_type,
        "alpha_channel": color_type in {4, 6},
        "file_size_bytes": path.stat().st_size,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: inspect_pngs.py <image-or-folder> [...]", file=sys.stderr)
        return 2

    try:
        results = [inspect_png(path) for path in iter_inputs(sys.argv[1:])]
    except (FileNotFoundError, ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1

    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
