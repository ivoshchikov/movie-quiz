"""Draw Hard Quiz's original Thanksgiving mood guide; no film imagery."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[3] / "frontend/public/blog-assets"
FONTS = Path("/usr/share/fonts/truetype/dejavu")
STEM = "thanksgiving-movies-by-mood"


def artwork(height):
    image = Image.new("RGB", (1200, height), "#171321")
    draw = ImageDraw.Draw(image)
    for y in range(height):
        draw.line((0, y, 1199, y), fill=(23 + y * 10 // height, 19 + y * 5 // height, 33 + y * 3 // height))

    def text(x, y, value, size, color="#fff4e7", bold=False):
        font = ImageFont.truetype(str(FONTS / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size)
        draw.text((x, y), value, font=font, fill=color)

    draw.rounded_rectangle((56, 44, 306, 83), radius=18, fill="#3c2b43")
    text(73, 55, "HARD QUIZ / MOVIE NIGHT", 15, "#ead0fa", True)
    text(53, 135, "THANKSGIVING", 62, bold=True)
    text(54, 214, "MOVIES", 86, "#e9ad77", True)
    text(59, 345, "What to watch by mood", 28, bold=True)
    text(60, 394, "Seven films. Choose your evening.", 20, "#c9bacb")

    # A stylized dinner table with three original place cards.
    draw.rounded_rectangle((721, 113, 1144, 527), radius=66, fill="#4a2c35", outline="#755047", width=3)
    draw.ellipse((795, 230, 1070, 450), fill="#d6bfa5", outline="#f0dcc0", width=4)
    draw.ellipse((818, 250, 1047, 431), fill="#303042", outline="#a28383", width=3)
    draw.ellipse((899, 306, 964, 371), fill="#b88058")
    for x, y in [(781, 156), (947, 156), (860, 452)]:
        draw.polygon([(x, y+44), (x+11, y), (x+150, y), (x+163, y+44)], fill="#f4e5cd")
    text(802, 169, "LAUGHS", 19, "#443043", True)
    text(959, 170, "TENSION", 18, "#443043", True)
    text(873, 465, "BITTERSWEET", 15, "#443043", True)
    for x in (758, 1103):
        draw.line((x, 270, x, 406), fill="#dbbaa0", width=4)
        draw.ellipse((x-9, 250, x+9, 286), outline="#dbbaa0", width=3)
    draw.line((60, height-66, 1140, height-66), fill="#65464d", width=2)
    text(60, height-47, "HARD-QUIZ.COM", 14, "#c9bacb", True)
    return image


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    base = artwork(675)
    for width, name in [(1200, "cover"), (800, "800"), (640, "640"), (480, "480")]:
        base.resize((width, round(width * 675 / 1200)), Image.Resampling.LANCZOS).save(OUT / f"{STEM}-{name}.webp", quality=85, method=6)
    artwork(630).save(OUT / f"{STEM}-social.webp", quality=85, method=6)
