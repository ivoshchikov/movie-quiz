"""Original typographic artwork. No third-party stills or actor likenesses."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'frontend/public/blog-assets'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def artwork(height=675):
    image = Image.new('RGB', (1200, height), '#101116')
    d = ImageDraw.Draw(image)
    for y in range(height):
        c = (16 + int(8*y/height), 17 + int(4*y/height), 22 + int(16*y/height))
        d.line((0,y,1199,y), fill=c)
    def text(x,y,value,size,color='#F4F1F9',bold=False):
        d.text((x,y),value,font=ImageFont.truetype(BOLD if bold else FONT,size),fill=color)
    d.rounded_rectangle((58,54,288,92),radius=19,fill='#343046')
    text(78,61,'HARD QUIZ / WATCHLIST',14,'#DDD5F4',True)
    text(58,142,'A STORY',75,bold=True)
    text(58,229,'FOR THE',75,bold=True)
    text(58,316,'WEEKEND',75,'#BB9EFF',True)
    text(61,437,'10 completed miniseries',28,bold=True)
    text(61,486,'Find your mood. Make time for the ending.',19,'#B4AFBE')
    # Two calendar cards; decorative episode strips carry no numeric data.
    for x,y,label,color in [(703,97,'SAT','#C3A6FF'),(839,226,'SUN','#F0BD8F')]:
        d.rounded_rectangle((x+11,y+14,x+275,y+330),radius=24,fill='#0B0C11')
        d.rounded_rectangle((x,y,x+264,y+316),radius=24,fill='#242330',outline='#474053',width=2)
        d.rounded_rectangle((x,y,x+264,y+72),radius=24,fill=color)
        d.rectangle((x,y+42,x+264,y+72),fill=color)
        text(x+27,y+14,label,30,'#201A2C',True)
        for row in range(5):
            sy=y+104+row*33
            d.rounded_rectangle((x+27,sy,x+237,sy+14),radius=7,fill='#464052')
            d.rounded_rectangle((x+27,sy,x+134+(row%3)*23,sy+14),radius=7,fill=color)
    d.line((60,height-62,1140,height-62),fill='#39343F',width=1)
    text(61,height-45,'SHORT SERIES / COMPLETE STORIES',13,'#918A9D',True)
    text(970,height-45,'hard-quiz.com',14,'#B4AFBE')
    return image

OUT.mkdir(parents=True,exist_ok=True)
base=artwork()
stem='completed-miniseries-to-watch'
for width,suffix in [(1200,'-cover'),(800,'-800'),(640,'-640'),(480,'-480')]:
    image=base.resize((width,round(width*675/1200)),Image.Resampling.LANCZOS)
    image.save(OUT/(stem+suffix+'.webp'),format='WEBP',quality=84,method=6)
artwork(630).save(OUT/(stem+'-social.webp'),format='WEBP',quality=84,method=6)
for p in sorted(OUT.glob(stem+'*.webp')):
    with Image.open(p) as im:print(p.name,im.size,p.stat().st_size)
