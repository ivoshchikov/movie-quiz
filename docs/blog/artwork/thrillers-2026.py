"""Render original Hard Quiz thriller cover/share art using Pillow and DejaVu Sans.

Run: python docs/blog/artwork/thrillers-2026.py [--font-dir PATH]
All shapes and typography are original. No film or actor imagery is used.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def render(height: int, font_dir: Path) -> Image.Image:
    scale = 2
    image = Image.new("RGB", (2400, height * scale), "#10131c")
    draw = ImageDraw.Draw(image)

    def text(x, y, value, size, color, bold=False):
        font = ImageFont.truetype(str(font_dir / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size * scale)
        draw.text((x * scale, y * scale), value, font=font, fill=color)

    def polygon(points, color):
        draw.polygon([(x * scale, y * scale) for x, y in points], fill=color)

    def line(points, color, width=1):
        draw.line([(x * scale, y * scale) for x, y in points], fill=color, width=width * scale)

    # A beam and connected case-file markers suggest suspense without imitating a film.
    polygon([(1200, 34), (620, 252), (1200, height - 30)], "#192330")
    for offset in range(6):
        line([(710 + offset * 76, 30), (880 + offset * 76, height - 30)], "#202b39")
    draw.rounded_rectangle((44 * scale, 30 * scale, 1156 * scale, (height - 30) * scale), radius=24 * scale, outline="#354052", width=scale)
    text(68, 56, "HARD QUIZ", 25, "#f2eee9", True)
    text(261, 61, "MOVIE GUIDES", 17, "#b2b9c6")
    text(64, 146, "THRILLERS", 83, "#f5f0e9", True)
    text(58, 239, "2026", 151, "#e8b779", True)
    line([(69, 435), (129, 435)], "#b6a3ff", 4)
    text(68, 462, "7 films. Choose your tension.", 29, "#eee9e2")
    text(70, 513, "Crime / Survival / Psychological suspense", 20, "#b2b9c6")
    text(70, height - 69, "A SPOILER-FREE WATCHLIST", 18, "#c6b6ff", True)
    points = [(858, 125), (1030, 183), (832, 277), (1040, 326), (868, 430), (1042, 500), (956, 565)]
    for a, b in zip(points, points[1:]):
        line([a, b], "#c2a06f", 2)
    for index, (x, y) in enumerate(points):
        draw.rounded_rectangle(((x - 48) * scale, (y - 35) * scale, (x + 48) * scale, (y + 35) * scale), radius=8 * scale, fill="#202a39", outline="#bfa073", width=scale)
        text(x - 30, y - 21, f"0{index + 1}", 29, "#f0dfc6", True)
    return image.resize((1200, height), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font-dir", type=Path, default=Path("/usr/share/fonts/truetype/dejavu"))
    args = parser.parse_args()
    destination = Path(__file__).resolve().parents[3] / "frontend/public/blog-assets"
    destination.mkdir(parents=True, exist_ok=True)
    for kind, height in (("cover", 675), ("social", 630)):
        target = destination / f"best-thriller-movies-2026-{kind}.webp"
        render(height, args.font_dir).save(target, "WEBP", quality=88, method=6)
        print(f"{target.name}: {target.stat().st_size} bytes")
