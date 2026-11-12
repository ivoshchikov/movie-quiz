"""Render the Hard Quiz December calendar cover and social image with Pillow."""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


WIDTH = 1200
SCALE = 2
OPENING_DAYS = (4, 11, 18, 23, 25, 30)


def render(height: int, font_dir: Path) -> Image.Image:
    image = ImageOps.colorize(
        Image.linear_gradient("L").transpose(Image.Transpose.ROTATE_90),
        "#171227",
        "#282047",
    ).resize((WIDTH * SCALE, height * SCALE))
    draw = ImageDraw.Draw(image)
    cream = "#fff5df"
    gold = "#ffd58e"
    muted = "#bdb4d5"

    def rounded(bounds, radius, fill, outline=None):
        draw.rounded_rectangle(
            tuple(value * SCALE for value in bounds), radius * SCALE,
            fill=fill, outline=outline, width=2 * SCALE,
        )

    def text(x, y, value, size, color, bold=False, anchor="lt"):
        filename = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        font = ImageFont.truetype(str(font_dir / filename), size * SCALE)
        draw.text((x * SCALE, y * SCALE), value, font=font, fill=color, anchor=anchor)

    inset = (36, 35, 1164, height - 35)
    rounded(inset, 28, None, "#51456b")
    for x in range(86, 1120, 34):
        rounded((x, 49, x + 16, 55), 3, "#443757")
        rounded((x, height - 55, x + 16, height - 49), 3, "#443757")

    text(83, 106, "HARD QUIZ", 25, muted, True)
    text(78, 204, "DECEMBER", 84, cream, True)
    text(75, 316, "2026", 141, gold, True)
    text(86, 493, "US THEATER DATES", 30, cream, True)

    panel = (660, 91, 1125, height - 91)
    rounded(panel, 26, "#1e1833", "#5b4e7c")
    text(892, 132, "SELECTED OPENINGS", 21, muted, True, "mt")
    for index, day in enumerate(OPENING_DAYS):
        x = 689 + index % 3 * 137
        y = 178 + index // 3 * 141
        highlighted = day in (18, 25)
        rounded((x, y, x + 123, y + 124), 16, gold if highlighted else "#34284f", None if highlighted else "#5b4e7c")
        text(x + 62, y + 15, "DEC", 18, "#4b3160" if highlighted else muted, True, "mt")
        text(x + 62, y + 46, str(day), 57, "#201731" if highlighted else cream, True, "mt")

    return image.resize((WIDTH, height), Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font-dir", type=Path, default=Path("/usr/share/fonts/truetype/dejavu"))
    args = parser.parse_args()
    destination = Path(__file__).resolve().parents[3] / "frontend/public/blog-assets"
    cover = render(675, args.font_dir)
    cover.save(destination / "december-2026-cover.webp", "WEBP", quality=89, method=6)
    for width in (480, 640, 800):
        small = cover.resize((width, width * 9 // 16), Image.Resampling.LANCZOS)
        small.save(destination / f"december-2026-{width}.webp", "WEBP", quality=88, method=6)
    render(630, args.font_dir).save(destination / "december-2026-social.webp", "WEBP", quality=89, method=6)


if __name__ == "__main__":
    main()
