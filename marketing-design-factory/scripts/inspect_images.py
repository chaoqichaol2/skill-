#!/usr/bin/env python3
"""Inspect PNG and JPEG files without third-party dependencies."""

from __future__ import annotations

import json
import struct
import sys
import zlib
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
JPEG_SOF_MARKERS = {
    0xC0, 0xC1, 0xC2, 0xC3,
    0xC5, 0xC6, 0xC7,
    0xC9, 0xCA, 0xCB,
    0xCD, 0xCE, 0xCF,
}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg"}


def iter_inputs(values: list[str]) -> list[Path]:
    paths: list[Path] = []
    for value in values:
        path = Path(value).expanduser()
        if path.is_dir():
            paths.extend(
                sorted(
                    candidate
                    for candidate in path.rglob("*")
                    if candidate.is_file() and candidate.suffix.lower() in IMAGE_SUFFIXES
                )
            )
        elif path.is_file():
            paths.append(path)
        else:
            raise FileNotFoundError(value)
    return paths


def inspect_png(path: Path, data: bytes) -> dict[str, object]:
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError(f"Not a PNG: {path}")

    offset = len(PNG_SIGNATURE)
    width = height = bit_depth = color_type = None
    saw_idat = False
    saw_iend = False
    idat_parts: list[bytes] = []
    interlace = None
    chunk_index = 0

    while offset < len(data):
        if len(data) - offset < 12:
            raise ValueError(f"Truncated PNG chunk: {path}")
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk_type = data[offset + 4:offset + 8]
        chunk_end = offset + 12 + length
        if chunk_end > len(data):
            raise ValueError(f"Truncated PNG chunk data: {path}")
        chunk_data = data[offset + 8:offset + 8 + length]
        expected_crc = struct.unpack(">I", data[offset + 8 + length:chunk_end])[0]
        actual_crc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
        if actual_crc != expected_crc:
            raise ValueError(f"PNG CRC mismatch in {chunk_type!r}: {path}")

        if chunk_index == 0:
            if chunk_type != b"IHDR" or length != 13:
                raise ValueError(f"Invalid PNG header: {path}")
            width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(
                ">IIBBBBB", chunk_data
            )
            if width <= 0 or height <= 0 or compression != 0 or filtering != 0 or interlace not in {0, 1}:
                raise ValueError(f"Invalid PNG IHDR values: {path}")
        elif chunk_type == b"IHDR":
            raise ValueError(f"Duplicate PNG IHDR: {path}")

        if chunk_type == b"IDAT":
            saw_idat = True
            idat_parts.append(chunk_data)
        if chunk_type == b"IEND":
            if length != 0:
                raise ValueError(f"Invalid PNG IEND: {path}")
            saw_iend = True
            offset = chunk_end
            if offset != len(data):
                raise ValueError(f"Unexpected data after PNG IEND: {path}")
            break

        offset = chunk_end
        chunk_index += 1

    if not saw_idat or not saw_iend or width is None:
        raise ValueError(f"Incomplete PNG: {path}")

    try:
        decoded = zlib.decompress(b"".join(idat_parts))
    except zlib.error as error:
        raise ValueError(f"PNG IDAT cannot be decompressed: {path}") from error
    if interlace == 0:
        samples = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(color_type)
        if samples is None:
            raise ValueError(f"Unsupported PNG color type: {path}")
        row_bytes = (width * samples * bit_depth + 7) // 8
        expected_decoded_size = (row_bytes + 1) * height
        if len(decoded) != expected_decoded_size:
            raise ValueError(f"PNG decoded scanline size mismatch: {path}")

    return {
        "path": str(path.resolve()),
        "format": "png",
        "width": width,
        "height": height,
        "bit_depth": bit_depth,
        "color_type": color_type,
        "alpha_channel": color_type in {4, 6},
        "file_size_bytes": len(data),
    }


def inspect_jpeg(path: Path, data: bytes) -> dict[str, object]:
    if len(data) < 4 or not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
        raise ValueError(f"Invalid or truncated JPEG: {path}")

    offset = 2
    width = height = bit_depth = components = None
    saw_scan = False
    saw_eoi = False
    in_scan = False
    while offset < len(data):
        if in_scan:
            marker_prefix = data.find(b"\xff", offset)
            if marker_prefix < 0:
                raise ValueError(f"JPEG scan has no terminating marker: {path}")
            marker_offset = marker_prefix
            while marker_offset < len(data) and data[marker_offset] == 0xFF:
                marker_offset += 1
            if marker_offset >= len(data):
                raise ValueError(f"Truncated JPEG scan marker: {path}")
            scan_marker = data[marker_offset]
            if scan_marker == 0x00 or 0xD0 <= scan_marker <= 0xD7:
                offset = marker_offset + 1
                continue
            offset = marker_prefix
            in_scan = False
            continue

        if data[offset] != 0xFF:
            raise ValueError(f"Invalid JPEG marker boundary: {path}")
        while offset < len(data) and data[offset] == 0xFF:
            offset += 1
        if offset >= len(data):
            raise ValueError(f"Truncated JPEG marker: {path}")
        marker = data[offset]
        offset += 1

        if marker == 0xD9:
            saw_eoi = True
            if offset != len(data):
                raise ValueError(f"Unexpected data after JPEG EOI: {path}")
            break
        if marker in {0x01, 0xD8} or 0xD0 <= marker <= 0xD7:
            continue
        if offset + 2 > len(data):
            raise ValueError(f"Truncated JPEG segment length: {path}")
        segment_length = struct.unpack(">H", data[offset:offset + 2])[0]
        if segment_length < 2 or offset + segment_length > len(data):
            raise ValueError(f"Invalid JPEG segment length: {path}")

        if marker in JPEG_SOF_MARKERS:
            if segment_length < 8:
                raise ValueError(f"Invalid JPEG SOF segment: {path}")
            bit_depth = data[offset + 2]
            height = struct.unpack(">H", data[offset + 3:offset + 5])[0]
            width = struct.unpack(">H", data[offset + 5:offset + 7])[0]
            components = data[offset + 7]
            if width <= 0 or height <= 0:
                raise ValueError(f"Invalid JPEG dimensions: {path}")
        if marker == 0xDA:
            saw_scan = True
            in_scan = True
        offset += segment_length

    if width is None or height is None or not saw_scan or not saw_eoi:
        raise ValueError(f"Incomplete JPEG structure: {path}")

    return {
        "path": str(path.resolve()),
        "format": "jpeg",
        "width": width,
        "height": height,
        "bit_depth": bit_depth,
        "color_components": components,
        "alpha_channel": False,
        "file_size_bytes": len(data),
    }


def inspect_image(path: Path) -> dict[str, object]:
    data = path.read_bytes()
    if data.startswith(PNG_SIGNATURE):
        return inspect_png(path, data)
    if data.startswith(b"\xff\xd8"):
        return inspect_jpeg(path, data)
    raise ValueError(f"Unsupported image encoding: {path}")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: inspect_images.py <image-or-folder> [...]", file=sys.stderr)
        return 2
    try:
        results = [inspect_image(path) for path in iter_inputs(sys.argv[1:])]
    except (FileNotFoundError, ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
