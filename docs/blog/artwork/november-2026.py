"""Render the original November calendar cover and social card (Pillow).

Run from any directory: python docs/blog/artwork/november-2026.py
Use --font-dir to point to a directory containing DejaVu Sans fonts.
No film artwork, actor likenesses or external images are used.
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def render(height: int, font_dir: Path) -> Image.Image:
    scale = 2
    image = Image.new("RGB", (1200 * scale, height * scale), "#11121a")
    draw = ImageDraw.Draw(image)

    def box(bounds, fill, outline=None, radius=0):
        coords = tuple(round(v * scale) for v in bounds)
        if radius:
            draw.rounded_rectangle(coords, radius=radius * scale, fill=fill, outline=outline, width=scale)
        else:
            draw.rectangle(coords, fill=fill, outline=outline, width=scale)

    def text(x, y, value, size, color, bold=False):
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        font = ImageFont.truetype(str(font_dir / name), size * scale)
        draw.text((x * scale, y * scale), value, font=font, fill=color, stroke_width=0)

    # A quiet cinema-grid background and an original ticket motif.
    for x in range(0, 1200, 80):
        draw.line((x * scale, 0, x * scale, height * scale), fill="#181a25", width=scale)
    for y in range(0, height, 80):
        draw.line((0, y * scale, 1200 * scale, y * scale), fill="#181a25", width=scale)
    box((44, 30, 1156, height - 30), None, "#303040", 24)
    box((64, 54, 70, 84), "#b6a3ff", radius=3)
    text(84, 49, "HARD QUIZ", 24, "#e7e3fb", True)
    text(277, 54, "MOVIE GUIDES", 18, "#aaa7bd")
    text(62, 132, "NOVEMBER", 96, "#f0eef8", True)
    text(58, 237, "2026", 156, "#c6b6ff", True)
    box((68, 447, 128, 452), "#b6a3ff", radius=2)
    text(65, 473, "10 films. One month to plan.", 29, "#ebe8f6")
    text(67, 524, "Dates  /  Cast  /  Spoiler-free previews", 21, "#b6b2ca")
    text(67, height - 69, "US THEATRICAL RELEASE GUIDE", 18, "#9f9bb2")

    box((790, 96, 1134, height - 64), "#1a1b29", "#47415e", 20)
    text(816, 121, "US THEATER DATES", 21, "#ddd7f2", True)
    for i, day in enumerate((6, 13, 20, 25)):
        x = 814 + (i % 2) * 154
        y = 179 + (i // 2) * 151
        box((x, y, x + 142, y + 135), "#272638", "#595071", 12)
        text(x + 18, y + 13, "NOV", 17, "#b5aacd", True)
        text(x + 17, y + 39, str(day), 68, "#f0eafa", True)
    text(816, height - 127, "WIDE-RELEASE", 17, "#aca4bf")
    text(816, height - 101, "HIGHLIGHTS", 17, "#aca4bf")
    return image.resize((1200, height), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font-dir", type=Path, default=Path("/usr/share/fonts/truetype/dejavu"))
    args = parser.parse_args()
    destination = Path(__file__).resolve().parents[3] / "frontend/public/blog-assets"
    destination.mkdir(parents=True, exist_ok=True)
    for kind, height in (("cover", 675), ("social", 630)):
        target = destination / ("november-2026-movie-releases-" + kind + ".webp")
        render(height, args.font_dir).save(target, "WEBP", quality=88, method=6)
        print(str(target) + ": " + str(target.stat().st_size) + " bytes")
