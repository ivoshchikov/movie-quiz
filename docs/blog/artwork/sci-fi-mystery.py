"""Draw Hard Quiz's original four-question sci-fi mystery cover."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[3] / "frontend/public/blog-assets"
FONTS = Path("/usr/share/fonts/truetype/dejavu")
STEM = "sci-fi-mystery-movies"


def artwork(height):
    image = Image.new("RGB", (1200, height), "#10121e")
    draw = ImageDraw.Draw(image)
    for y in range(height):
        draw.line((0, y, 1199, y), fill=(16 + y * 6 // height, 18 + y * 5 // height, 30 + y * 13 // height))

    def text(x, y, value, size, color="#f5f3fa", bold=False):
        font = ImageFont.truetype(str(FONTS / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size)
        draw.text((x, y), value, font=font, fill=color)

    draw.rounded_rectangle((57, 48, 289, 88), radius=20, fill="#332c4a")
    text(75, 59, "HARD QUIZ / WATCHLIST", 15, "#d9caff", True)
    text(54, 129, "10 SCI-FI", 85, bold=True)
    text(54, 234, "MYSTERIES", 76, "#bea6ff", True)
    text(60, 369, "Choose your kind of puzzle", 26, bold=True)
    text(60, 413, "A spoiler-free movie guide", 21, "#c0b9d2")

    cards = [
        (757, 177, "01 / IDENTITY", "Who am I?", "#baa7ff"),
        (990, 177, "02 / REALITY", "What is real?", "#76e0c5"),
        (757, 398, "03 / TIME", "What changes?", "#f5b589"),
        (990, 398, "04 / CONTACT", "Who is there?", "#92c7ff"),
    ]
    for x, y, label, question, color in cards:
        draw.rounded_rectangle((x - 103, y - 61, x + 103, y + 105), radius=20, fill="#202438", outline="#45435d", width=2)
        text(x - 84, y - 40, label, 14, color, True)
        text(x - 84, y + 63, question, 17, "#eee9fa")

    # Four abstract motifs are decorative, not movie stills or a factual chart.
    x, y = 757, 177
    draw.ellipse((x-18, y-5, x+18, y+31), outline="#baa7ff", width=3)
    draw.arc((x-37, y+21, x+37, y+83), 195, 345, fill="#baa7ff", width=3)
    x, y = 990, 177
    draw.rectangle((x-34, y-2, x+10, y+42), outline="#76e0c5", width=3)
    draw.rectangle((x-10, y+10, x+34, y+54), outline="#76e0c5", width=3)
    x, y = 757, 398
    draw.ellipse((x-28, y-5, x+28, y+51), outline="#f5b589", width=3)
    draw.line((x, y+5, x, y+23, x+15, y+32), fill="#f5b589", width=3)
    x, y = 990, 398
    for radius in (14, 26, 38):
        draw.arc((x-radius, y+23-radius, x+radius, y+23+radius), 220, 320, fill="#92c7ff", width=3)
    draw.ellipse((x-4, y+32, x+4, y+40), fill="#92c7ff")

    draw.line((62, height-66, 1138, height-66), fill="#423955", width=2)
    text(62, height-48, "HARD-QUIZ.COM", 14, "#c0b9d2", True)
    return image


if __name__ == "__main__":
    base = artwork(675)
    for width, name in [(1200, "cover"), (800, "800"), (640, "640"), (480, "480")]:
        base.resize((width, round(width * 675 / 1200)), Image.Resampling.LANCZOS).save(OUT / f"{STEM}-{name}.webp", quality=84, method=6)
    artwork(630).save(OUT / f"{STEM}-social.webp", quality=84, method=6)
