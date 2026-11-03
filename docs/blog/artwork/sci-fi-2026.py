"""Draw the original Hard Quiz sci-fi watchlist cover and share image."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[3] / "frontend/public/blog-assets"
FONTS = Path("/usr/share/fonts/truetype/dejavu")
STEM = "best-sci-fi-movies-2026"


def artwork(height):
    image = Image.new("RGB", (1200, height), "#10111d")
    draw = ImageDraw.Draw(image)
    for y in range(height):
        fill = (15 + y * 8 // height, 17 + y * 6 // height, 28 + y * 18 // height)
        draw.line((0, y, 1199, y), fill=fill)

    def text(x, y, value, size, color="#f5f3fa", bold=False):
        font = ImageFont.truetype(str(FONTS / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size)
        draw.text((x, y), value, font=font, fill=color)

    draw.rounded_rectangle((57, 53, 289, 93), radius=20, fill="#332c4a")
    text(75, 64, "HARD QUIZ / WATCHLIST", 15, "#d9caff", True)
    text(54, 147, "SCI-FI", 111, bold=True)
    text(55, 264, "IN 2026", 98, "#bea6ff", True)
    text(62, 413, "Seven movies to watch now", 26, bold=True)
    text(62, 458, "A spoiler-free guide", 21, "#c0b9d2")

    # Four decorative map nodes, each with a different genre motif.
    colors = ("#baa7ff", "#76e0c5", "#f5b589", "#92c7ff")
    positions = ((730, 211), (984, 211), (730, 439), (984, 439))
    draw.line((730, 211, 984, 439), fill="#53486e", width=2)
    draw.line((730, 439, 984, 211), fill="#53486e", width=2)
    draw.ellipse((835, 303, 879, 347), fill="#272137", outline="#b1a0d7", width=2)
    draw.ellipse((853, 321, 861, 329), fill="#d8caf4")

    for (x, y), color, label in zip(positions, colors, ("SPACE", "A.I.", "OTHER WORLDS", "SURVIVAL")):
        draw.rounded_rectangle((x - 94, y - 80, x + 94, y + 80), radius=22, fill="#202237", outline="#413b56", width=2)
        width = draw.textlength(label, font=ImageFont.truetype(str(FONTS / "DejaVuSans-Bold.ttf"), 15))
        text(x - width / 2, y + 43, label, 15, color, True)

    x, y = positions[0]
    draw.ellipse((x-24, y-45, x+24, y+3), outline=colors[0], width=4)
    draw.arc((x-46, y-31, x+46, y-9), 5, 175, fill=colors[0], width=4)

    x, y = positions[1]
    draw.rounded_rectangle((x-26, y-47, x+26, y+5), radius=8, outline=colors[1], width=4)
    draw.rounded_rectangle((x-10, y-31, x+10, y-11), radius=3, fill=colors[1])
    for offset in (-15, 0, 15):
        draw.line((x+offset, y-58, x+offset, y-48), fill=colors[1], width=3)
        draw.line((x+offset, y+5, x+offset, y+16), fill=colors[1], width=3)
        draw.line((x-37, y-21+offset, x-26, y-21+offset), fill=colors[1], width=3)
        draw.line((x+26, y-21+offset, x+37, y-21+offset), fill=colors[1], width=3)

    x, y = positions[2]
    draw.rounded_rectangle((x-32, y-43, x+15, y+4), radius=7, outline=colors[2], width=4)
    draw.rounded_rectangle((x-15, y-52, x+32, y-5), radius=7, outline=colors[2], width=4)

    x, y = positions[3]
    draw.line(((x-41, y+7), (x-12, y-34), (x+3, y-13), (x+18, y-38), (x+42, y+7), (x-41, y+7)), fill=colors[3], width=4, joint="curve")
    draw.ellipse((x-2, y-56, x+9, y-45), fill=colors[3])

    draw.line((62, height-66, 1138, height-66), fill="#423955", width=2)
    text(62, height-48, "HARD-QUIZ.COM", 14, "#c0b9d2", True)
    return image


if __name__ == "__main__":
    base = artwork(675)
    for width, name in [(1200, "cover"), (800, "800"), (640, "640"), (480, "480")]:
        base.resize((width, round(width * 675 / 1200)), Image.Resampling.LANCZOS).save(
            OUT / f"{STEM}-{name}.webp", quality=84, method=6
        )
    artwork(630).save(OUT / f"{STEM}-social.webp", quality=84, method=6)
