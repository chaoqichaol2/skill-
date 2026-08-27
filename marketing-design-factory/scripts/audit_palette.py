#!/usr/bin/env python3
"""Report palette-risk signals for marketing artwork.

This is a preflight aid, not an aesthetic verdict. It detects broad palette
conditions that commonly correlate with unsupported neon/cyber colour and
too many competing saturated hue families. A visual review against the
approved palette blueprint remains mandatory.
"""

from __future__ import annotations

import argparse
import colorsys
import json
import sys
from collections import Counter
from pathlib import Path

try:
    from PIL import Image
except ImportError as error:  # pragma: no cover - depends on runtime setup
    raise SystemExit("Pillow is required: python3 -m pip install Pillow") from error


HUE_LABELS = (
    "red",
    "orange",
    "yellow",
    "yellow-green",
    "green",
    "cyan-green",
    "cyan",
    "sky-blue",
    "blue",
    "violet",
    "magenta",
    "rose",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit dominant colours and saturated-hue competition."
    )
    parser.add_argument("images", nargs="+", help="PNG/JPEG/WebP image paths")
    parser.add_argument(
        "--allow-cool",
        action="store_true",
        help="Suppress the neon blue/purple warning for an approved cool scene.",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON only.")
    parser.add_argument(
        "--fail-on-risk",
        action="store_true",
        help="Exit 1 when a high palette-risk signal is found.",
    )
    return parser.parse_args()


def load_pixels(path: Path) -> list[tuple[int, int, int]]:
    with Image.open(path) as source:
        image = source.convert("RGBA")
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        return [
            (red, green, blue)
            for red, green, blue, alpha in image.getdata()
            if alpha >= 32
        ]


def dominant_colours(pixels: list[tuple[int, int, int]]) -> list[dict[str, object]]:
    strip = Image.new("RGB", (len(pixels), 1))
    strip.putdata(pixels)
    quantized = strip.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()
    counts = Counter(quantized.getdata())
    total = len(pixels)
    results: list[dict[str, object]] = []
    for index, count in counts.most_common(8):
        offset = index * 3
        rgb = tuple(palette[offset : offset + 3])
        results.append(
            {
                "hex": "#" + "".join(f"{channel:02X}" for channel in rgb),
                "rgb": rgb,
                "share": round(count / total, 4),
            }
        )
    return results


def circular_components(active_bins: set[int]) -> list[list[int]]:
    if not active_bins:
        return []
    remaining = set(active_bins)
    components: list[list[int]] = []
    while remaining:
        start = remaining.pop()
        component = {start}
        frontier = [start]
        while frontier:
            current = frontier.pop()
            for neighbour in ((current - 1) % 12, (current + 1) % 12):
                if neighbour in remaining:
                    remaining.remove(neighbour)
                    component.add(neighbour)
                    frontier.append(neighbour)
        components.append(sorted(component))
    return components


def audit(path: Path, allow_cool: bool) -> dict[str, object]:
    pixels = load_pixels(path)
    if not pixels:
        raise ValueError(f"No visible pixels: {path}")

    total = len(pixels)
    hue_counts = [0] * 12
    saturated_count = 0
    neon_cool_count = 0

    for red, green, blue in pixels:
        hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
        if saturation >= 0.55 and value >= 0.35:
            saturated_count += 1
            hue_counts[int(hue * 12) % 12] += 1
        degrees = hue * 360
        if 195 <= degrees <= 300 and saturation >= 0.65 and value >= 0.58:
            neon_cool_count += 1

    hue_shares = [count / total for count in hue_counts]
    active_bins = {index for index, share in enumerate(hue_shares) if share >= 0.05}
    components = circular_components(active_bins)
    strong_families = [
        {
            "labels": [HUE_LABELS[index] for index in component],
            "share": round(sum(hue_shares[index] for index in component), 4),
        }
        for component in sorted(
            components,
            key=lambda item: sum(hue_shares[index] for index in item),
            reverse=True,
        )
    ]

    saturated_share = saturated_count / total
    neon_cool_share = neon_cool_count / total
    warnings: list[str] = []
    risk = "low"

    if len(strong_families) >= 3:
        warnings.append(
            f"{len(strong_families)} separated high-saturation hue families carry at least 5% each."
        )
        risk = "high" if len(strong_families) >= 4 else "moderate"
    if saturated_share >= 0.72 and len(strong_families) >= 2:
        warnings.append("Most visible pixels are highly saturated across multiple hue families.")
        risk = "high"
    if not allow_cool and neon_cool_share >= 0.12:
        warnings.append(
            "Bright saturated blue/violet occupies at least 12%; verify that it is approved and scene-supported."
        )
        risk = "high" if neon_cool_share >= 0.30 else max(risk, "moderate", key=("low", "moderate", "high").index)

    return {
        "path": str(path.resolve()),
        "visible_pixels_sampled": total,
        "dominant_colours": dominant_colours(pixels),
        "saturated_pixel_share": round(saturated_share, 4),
        "bright_cool_pixel_share": round(neon_cool_share, 4),
        "strong_hue_families": strong_families,
        "risk": risk,
        "warnings": warnings,
        "note": "Risk signals only; compare with the approved palette blueprint and perform visual review.",
    }


def print_human(results: list[dict[str, object]]) -> None:
    for result in results:
        print(result["path"])
        dominant = ", ".join(
            f"{item['hex']} {item['share']:.1%}" for item in result["dominant_colours"]
        )
        families = "; ".join(
            f"{'/'.join(item['labels'])} {item['share']:.1%}"
            for item in result["strong_hue_families"]
        ) or "none"
        print(f"  dominant: {dominant}")
        print(f"  saturated coverage: {result['saturated_pixel_share']:.1%}")
        print(f"  bright blue/violet coverage: {result['bright_cool_pixel_share']:.1%}")
        print(f"  strong hue families: {families}")
        print(f"  palette risk: {result['risk']}")
        for warning in result["warnings"]:
            print(f"  warning: {warning}")
        print("  note: automated signal only; visual review remains mandatory")


def main() -> int:
    args = parse_args()
    try:
        results = [audit(Path(value).expanduser(), args.allow_cool) for value in args.images]
    except (FileNotFoundError, OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        print_human(results)

    if args.fail_on_risk and any(result["risk"] == "high" for result in results):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
