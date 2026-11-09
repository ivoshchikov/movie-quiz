"""Original Hard Quiz editorial graphics. No imported photographs, logos or posters.

Rebuild: python docs/blog/artwork/editorial-illustrations.py
The JSON brief and these drawing primitives are the complete visual source.
Only Pillow and the system DejaVu font are used; no font files are distributed.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json
import math
import random
import textwrap

ROOT = Path(__file__).resolve().parents[3]
BRIEF = Path(__file__).with_name('blog-editorial-artwork.json')
OUT = ROOT / 'frontend/public/blog-assets/original'
FONT = Path('/usr/share/fonts/truetype/dejavu')

# Motifs describe an editorial subject, never a film's character design or a shot.
MOTIFS = {
    'arrival': ('signal', 'LANGUAGE / DISCOVERY'), 'moon': ('orbit', 'WORK / IDENTITY'),
    'coherence': ('split', 'DINNER / REALITY'), 'source-code': ('clock', 'TIME / EVIDENCE'),
    'ex-machina': ('network', 'TRUST / CONSCIOUSNESS'), 'dark-city': ('city', 'MEMORY / NIGHT'),
    'minority-report': ('lens', 'PREDICTION / PROOF'), 'gattaca': ('helix', 'IDENTITY / AMBITION'),
    'the-thirteenth-floor': ('city', 'SIMULATION / MEMORY'), 'the-vast-of-night': ('signal', 'LISTENING / CONTACT'),
    'project-hail-mary': ('orbit', 'SPACE / PROBLEM-SOLVING'), 'disclosure-day': ('signal', 'CONTACT / UNCERTAINTY'),
    'good-luck-have-fun-dont-die': ('clock', 'TIME / SECOND CHANCES'), 'hoppers': ('forest', 'NATURE / IDENTITY'),
    'the-end-of-oak-street': ('city', 'HOME / THE UNKNOWN'), 'redux-redux': ('split', 'CHOICE / OTHER WORLDS'),
    'rose-of-nevada': ('sea', 'TIME / THE SEA'), 'whalefall-coast': ('sea', 'A BOOK / A SURVIVAL STORY'),
    'unorthodox': ('door', 'LEAVING / BEGINNING AGAIN'), 'when-they-see-us': ('scales', 'JUSTICE / INSTITUTIONS'),
    'chernobyl': ('signal', 'HISTORY / RESPONSIBILITY'), 'normal-people': ('bridge', 'CLOSENESS / DISTANCE'),
    'five-days-at-memorial': ('rain', 'A HOSPITAL / A DISASTER'), 'the-queens-gambit': ('chess', 'AMBITION / STRATEGY'),
    'one-day': ('clock', 'ROMANCE / PASSING YEARS'), 'godless': ('mountains', 'FRONTIER / RECKONING'),
    'station-eleven': ('stage', 'SURVIVAL / PERFORMANCE'), 'maid': ('door', 'HOME / INDEPENDENCE'),
    'glass-onion': ('maze', 'A GATHERING / HIDDEN MOTIVES'), 'wake-up-dead-man': ('gate', 'COMMUNITY / SUSPICION'),
    'clue': ('keys', 'A HOUSE / A SUSPECT LIST'), 'see-how-they-run': ('stage', 'A THEATRE / A MURDER'),
    'the-last-of-sheila': ('sea', 'A VOYAGE / A SECRET'), 'gosford-park': ('dinner', 'CLASS / A HOUSEHOLD'),
    'murder-on-the-orient-express': ('train', 'A JOURNEY / A CASE'), 'death-on-the-nile': ('sea', 'A RIVER / A CASE'),
    'sleuth': ('maze', 'RIVALRY / DECEPTION'), 'deathtrap': ('stage', 'WRITING / SUSPICION'),
    'resident-evil': ('city', 'SURVIVAL / DANGER'), 'obsession': ('lens', 'A WISH / A COST'),
    'hokum': ('door', 'AN ARRIVAL / UNEASE'), 'send-help': ('island', 'ISOLATION / SURVIVAL'),
    'backrooms': ('maze', 'SPACE / UNEASE'), 'the-bone-temple': ('gate', 'SURVIVAL / BELIEF'),
    'primate': ('forest', 'A HOME / A THREAT'), 'the-cat-in-the-hat': ('book', 'ANIMATED ADVENTURE'),
    'godzilla-minus-zero': ('city', 'A CITY / A CRISIS'), 'wild-horse-nine': ('mountains', 'A MISSION / TRUST'),
    'ebenezer': ('clock', 'A SEASONAL GHOST STORY'), 'how-to-rob-a-bank': ('keys', 'A PLAN / A HEIST'),
    'paper-tiger': ('split', 'LOYALTY / CONSEQUENCES'), 'sunrise-on-the-reaping': ('gate', 'A PREQUEL / A CONTEST'),
    'i-play-rocky': ('stage', 'AN ACTOR / A BEGINNING'), 'hexed': ('book', 'ANIMATED FANTASY'),
    'focker-in-law': ('dinner', 'A FAMILY / A COMEDY'), 'bad-guys-2': ('keys', 'AN ANIMATED CAPER'),
    'naked-gun-2025': ('lens', 'A POLICE SPOOF'), 'freaky-friday-2': ('split', 'A FAMILY / SWAPPED ROLES'),
    'weapons-2025': ('door', 'A COMMUNITY / A MYSTERY'), 'nobody-2': ('mountains', 'A HOLIDAY / AN ACTION STORY'),
    'honey-dont': ('lens', 'AN INVESTIGATION / DARK HUMOR'), 'ne-zha-2': ('mountains', 'MYTH / ANIMATED ADVENTURE'),
    'the-conjuring-last-rites': ('door', 'A SUPERNATURAL MYSTERY'), 'demon-slayer-infinity-castle': ('gate', 'ANIMATED FANTASY'),
    'downton-abbey-the-grand-finale': ('dinner', 'A HOUSEHOLD / A FAREWELL'), 'spinal-tap-ii': ('stage', 'MUSIC / COMEDY'),
    'the-long-walk': ('mountains', 'A JOURNEY / AN ORDEAL'), 'a-big-bold-beautiful-journey': ('bridge', 'ROMANCE / DISCOVERY'),
    'him-2025': ('gate', 'SPORT / AMBITION'), 'the-strangers-chapter-2': ('forest', 'ISOLATION / DANGER'),
    'gabbys-dollhouse-the-movie': ('book', 'A FAMILY FANTASY'),
}
PALETTES = [('#111c2a', '#f0c681', '#75b7bf'), ('#211b2e', '#bca0e6', '#eab58e'),
            ('#122629', '#86c8b3', '#e8cb97'), ('#2c2026', '#e3a18e', '#b2b9dd'),
            ('#1c2332', '#97b5e2', '#edbe83'), ('#27251b', '#d7c685', '#a1c7b0')]


def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size)


def motif_for(record):
    for key in sorted(MOTIFS, key=len, reverse=True):
        if record['id'].endswith(key):
            return MOTIFS[key]
    return ('book', 'A HARD QUIZ EDITORIAL GUIDE')


def motif(kind, accent, secondary, seed):
    """A 500px original graphic made only from ordinary geometric primitives."""
    im = Image.new('RGBA', (500, 500)); d = ImageDraw.Draw(im)
    pale = '#f4e9d9'; dark = '#151c29'; rng = random.Random(seed)
    d.ellipse((25, 25, 475, 475), fill=accent+'18', outline=secondary+'50', width=2)
    for _ in range(32):
        x,y=rng.randrange(40,460),rng.randrange(40,460);d.ellipse((x,y,x+2,y+2), fill=secondary+'90')
    line=lambda xy,fill=accent,width=6:d.line(xy,fill=fill,width=width)
    if kind in ('city','train'):
        for x in range(75,435,57):
            y=rng.randrange(110,230);d.rounded_rectangle((x,y,x+44,366),radius=3,fill=secondary+'55',outline=secondary,width=2)
            for yy in range(y+18,350,25):d.rectangle((x+10,yy,x+16,yy+7),fill=pale)
        d.polygon([(150,435),(245,300),(265,300),(365,435)],fill=accent+'88')
        if kind=='train':
            d.rounded_rectangle((140,270,361,368),radius=15,fill=dark,outline=accent,width=5)
            for x in [164,223,282]:d.rounded_rectangle((x,290,x+41,320),radius=4,fill=secondary)
            for x in [177,324]:d.ellipse((x-11,357,x+11,379),fill=pale)
    elif kind in ('orbit','signal','lens'):
        if kind=='orbit':
            for box in [(50,170,450,330),(95,90,405,410)]:d.ellipse(box,outline=secondary,width=3)
            d.ellipse((178,178,322,322),fill=accent,outline=pale,width=4)
            d.ellipse((92,203,118,229),fill=pale)
        elif kind=='signal':
            for r in [55,110,168]:d.arc((250-r,250-r,250+r,250+r),200,340,fill=accent,width=7)
            d.polygon([(244,285),(257,285),(295,422),(206,422)],fill=secondary)
            d.ellipse((233,260,267,294),fill=pale)
        else:
            d.ellipse((115,88,355,328),fill=dark,outline=accent,width=12);d.ellipse((151,124,319,292),outline=secondary,width=2)
            line([(324,302),(420,412)],accent,23)
            for y in [179,212,245]:line([(180,y),(281,y)],secondary,3)
    elif kind in ('maze','network','split'):
        if kind=='maze':
            for xy in [[80,90,420,90,420,410,80,410,80,155,350,155,350,345,150,345,150,220,280,220,280,280]]:
                d.line(xy,fill=accent,width=11,joint='curve')
            d.ellipse((254,254,280,280),fill=pale)
        elif kind=='network':
            nodes=[(120,130),(365,110),(250,250),(100,355),(365,380)]
            for p in nodes:
                for q in nodes:line([p,q],secondary+'90',3)
            for x,y in nodes:d.ellipse((x-23,y-23,x+23,y+23),fill=accent,outline=pale,width=3)
        else:
            for x,y in [(100,110),(200,190),(290,275)]:d.rounded_rectangle((x,y,x+125,y+145),radius=15,fill=dark,outline=accent,width=5)
            line([(70,390),(430,85)],secondary,4)
    elif kind in ('clock','helix'):
        if kind=='clock':
            d.ellipse((92,92,408,408),fill=dark,outline=accent,width=9)
            for a in range(0,360,30):
                r=math.radians(a);line([(250+133*math.sin(r),250+133*math.cos(r)),(250+145*math.sin(r),250+145*math.cos(r))],secondary,4)
            line([(250,150),(250,250),(335,298)],pale,9);d.ellipse((239,239,261,261),fill=accent)
        else:
            a=[];b=[]
            for y in range(90,411,4):a.append((250+83*math.sin(y/54),y));b.append((250-83*math.sin(y/54),y))
            d.line(a,fill=accent,width=9);d.line(b,fill=secondary,width=9)
            for y in range(105,400,26):line([(250+83*math.sin(y/54),y),(250-83*math.sin(y/54),y)],pale,3)
    elif kind in ('sea','island','bridge','rain'):
        d.ellipse((310,85,390,165),fill=accent)
        for y in [260,300,340,380]:
            pts=[(x,y+10*math.sin(x/47+y/29)) for x in range(50,451,4)];d.line(pts,fill=secondary,width=4)
        if kind=='island':d.polygon([(155,315),(248,210),(345,315)],fill=accent)
        elif kind=='bridge':
            d.arc((70,165,430,390),180,360,fill=accent,width=13);line([(70,278),(430,278)],pale,5)
        elif kind=='rain':
            d.rounded_rectangle((185,170,310,300),radius=5,fill=dark,outline=pale,width=3)
            for x in [110,160,330,385]:line([(x,150),(x-24,205)],accent,4)
        else:d.polygon([(135,280),(365,280),(323,322),(182,322)],fill=accent)
    elif kind in ('forest','mountains'):
        for x,y in [(150,270),(260,200),(355,280)]:
            d.polygon([(x-105,370),(x,y-110),(x+105,370)],fill=secondary+'60',outline=secondary,width=3)
        d.polygon([(205,440),(252,300),(269,300),(335,440)],fill=accent+'b0')
        if kind=='forest':
            for x,y in [(100,180),(390,200)]:
                line([(x,y),(x,y+205)],pale,4);d.polygon([(x-50,y+105),(x,y),(x+50,y+105)],fill=accent)
    elif kind in ('door','gate'):
        if kind=='door':
            d.rectangle((130,80,370,397),fill=dark,outline=secondary,width=6)
            d.polygon([(145,95),(315,125),(315,412),(145,382)],fill=accent+'75',outline=accent,width=5)
            d.ellipse((282,257,294,269),fill=pale)
            d.polygon([(147,397),(316,410),(410,465),(63,465)],fill=accent+'50')
        else:
            for x in [93,180,267,354]:d.rectangle((x,130,x+36,400),fill=secondary+'80',outline=secondary,width=2)
            d.arc((88,45,395,260),180,360,fill=accent,width=14);line([(68,410),(432,410)],pale,4)
    elif kind in ('book','keys','scales','chess','dinner','stage'):
        if kind=='book':
            d.polygon([(75,125),(250,165),(425,125),(425,375),(250,415),(75,375)],fill=secondary+'55',outline=pale,width=4)
            line([(250,166),(250,413)],accent,5)
            for y in [200,235,270,305]:line([(105,y),(220,y+25)],accent,4);line([(280,y+25),(395,y)],accent,4)
        elif kind=='keys':
            d.ellipse((100,120,265,285),outline=accent,width=14);line([(241,263),(389,411)],pale,16)
            line([(335,355),(370,322)],secondary,12);line([(365,385),(399,351)],secondary,12)
        elif kind=='scales':
            line([(250,85),(250,389)],accent,8);line([(115,163),(385,163)],pale,6)
            for x in [133,367]:
                line([(x,163),(x-44,286),(x+44,286),(x,163)],secondary,4);d.pieslice((x-54,255,x+54,327),0,180,fill=accent)
            d.rectangle((170,390,330,408),fill=accent)
        elif kind=='chess':
            for yy in range(5):
                for xx in range(5):d.rectangle((110+xx*58,110+yy*58,168+xx*58,168+yy*58),fill=(secondary+'80' if (xx+yy)%2 else accent+'28'))
            d.ellipse((223,151,277,205),fill=pale);d.polygon([(238,199),(262,199),(287,320),(214,320)],fill=pale)
            d.rounded_rectangle((199,319,301,343),radius=8,fill=accent)
        elif kind=='dinner':
            d.ellipse((90,125,410,385),fill=secondary+'50',outline=secondary,width=3);d.ellipse((154,177,346,333),outline=accent,width=5)
            for x in [71,430]:line([(x,190),(x,340)],pale,5)
            d.rectangle((243,75,257,145),fill=pale);d.ellipse((242,56,258,78),fill=accent)
        else:
            d.polygon([(70,100),(175,100),(135,365),(70,365)],fill=accent+'a0');d.polygon([(325,100),(430,100),(430,365),(365,365)],fill=accent+'a0')
            d.arc((150,100,350,340),180,360,fill=secondary,width=4);line([(75,382),(425,382)],pale,6)
            d.ellipse((235,230,265,260),fill=pale);line([(250,259),(250,331)],secondary,11)
    return im


def scene(kind, width=2390, height=1000):
    im=Image.new('RGB',(width,height),'#203447');d=ImageDraw.Draw(im)
    if kind=='station':
        d.rectangle((0,0,width,height*.68),fill='#809b9c')
        for x in range(75,width,320):d.rectangle((x,70,x+230,560),fill='#314e61',outline='#d3cdb6',width=14)
        d.polygon([(0,height*.7),(width,height*.57),(width,height),(0,height)],fill='#c1b798')
        for x,y in [(130,620),(1060,570),(2200,625)]:
            r=35;d.ellipse((x-r,y-170,x+r,y-100),fill='#efc68c');d.rounded_rectangle((x-45,y-100,x+45,y+85),radius=20,fill='#263047');d.line((x-25,y+85,x-40,y+225),fill='#1c293b',width=24);d.line((x+25,y+85,x+40,y+225),fill='#1c293b',width=24)
        cx=width//2;d.ellipse((cx-90,135,cx+90,315),fill='#eee6ce',outline='#263047',width=10);d.line((cx,165,cx,225,cx+45,252),fill='#263047',width=9)
        d.rectangle((300,650,690,685),fill='#3c4f55');d.line((330,685,320,800),fill='#3c4f55',width=13);d.line((660,685,670,800),fill='#3c4f55',width=13)
    else:
        d.rectangle((0,0,width,height//2),fill='#a3b6b0');d.ellipse((width*.65,85,width*.65+95,180),fill='#f1d7a4')
        for y in range(int(height*.55),height,45):d.line((0,y,width,y),fill='#779b9d',width=2)
        d.polygon([(0,height*.68),(width*.35,height*.6),(width*.47,height),(0,height)],fill='#263d49')
        x=int(width*.27);y=int(height*.66);d.ellipse((x-11,y-65,x+11,y-43),fill='#e0bb91');d.rounded_rectangle((x-17,y-43,x+17,y+28),radius=7,fill='#d4b891');d.line((x-8,y+25,x-10,y+83),fill='#182a38',width=10);d.line((x+8,y+25,x+10,y+83),fill='#182a38',width=10)
    return im


def compose(record, height=None):
    layout=record['layout'];seed=int(hashlib.sha256(record['id'].encode()).hexdigest()[:8],16)
    if layout in ('station','negative'):
        return scene(layout,2390 if layout=='station' else 1200,1000 if layout=='station' else 675)
    w,h=(600,900) if layout=='portrait' else (1200,height or 675)
    bg,accent,secondary=PALETTES[seed%len(PALETTES)];im=Image.new('RGB',(w,h),bg);d=ImageDraw.Draw(im)
    base=tuple(int(bg[i:i+2],16) for i in (1,3,5))
    for y in range(h):d.line((0,y,w,y),fill=tuple(min(255,v+y*8//h) for v in base))
    kind,tag=motif_for(record)
    if layout=='cover':kind='book' if 'archive' in record['id'] else 'split';tag='MOVIE GUIDES / ORIGINAL ARTWORK' if 'archive' in record['id'] else 'COMPOSITION / ASPECT RATIOS'
    graphic=motif(kind,accent,secondary,seed)
    portrait=layout=='portrait';size=420 if portrait else 525
    graphic=graphic.resize((size,size),Image.Resampling.LANCZOS);im.paste(graphic,((w-size)//2,115) if portrait else (26,92),graphic)
    d=ImageDraw.Draw(im)
    d.text((35 if portrait else 54,38),'HARD QUIZ / ORIGINAL ILLUSTRATION',font=font(17 if portrait else 18,True),fill=secondary)
    x,y,area=(42,581,516) if portrait else (615,184,535)
    title=record['title'];size=43 if portrait else 47
    while True:
        f=font(size,True);lines=[];line=''
        for word in title.split():
            test=(line+' '+word).strip()
            if d.textlength(test,font=f)>area and line:lines.append(line);line=word
            else:line=test
        lines.append(line)
        if len(lines)<=4 or size<=28:break
        size-=2
    for line in lines:d.text((x,y),line,font=f,fill='#f5ecdf');y+=size+12
    tagfont=font(15 if portrait else 17,True)
    for line in textwrap.wrap(tag,33 if portrait else 36):d.text((x,y+18),line,font=tagfont,fill=accent);y+=26
    d.line((38,h-71,w-38,h-71),fill=secondary,width=1)
    d.text((40,h-52),'EDITORIAL ART / NOT A FILM STILL',font=font(13 if portrait else 15),fill=secondary)
    return im


def main():
    OUT.mkdir(parents=True,exist_ok=True);brief=json.loads(BRIEF.read_text());metadata={};manifest=[];thumbs=[]
    # Inline film illustrations were withdrawn at the owner’s request; retain title cards only.
    for record in brief:
        if record['layout'] != 'cover':
            continue
        im=compose(record);w,h=im.size;cover=record['layout']=='cover';stem=record['id']+('-cover' if cover else '-illustration');variants=[]
        widths=([480,640,800,1200] if cover else [160,320,600] if record['layout']=='portrait' else [960,1440,2390] if record['layout']=='station' else [480,800,1200])
        for width in widths:
            suffix='' if width==w else '-'+str(width);p=OUT/(stem+suffix+'.webp');scaled=im.resize((width,round(h*width/w)),Image.Resampling.LANCZOS);scaled.save(p,quality=85,method=6)
            variants.append({'src':'/blog-assets/original/'+p.name,'width':width,'height':scaled.height,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
        social=None
        if cover:
            p=OUT/(record['id']+'-social.webp');compose(record,630).save(p,quality=85,method=6);social='/blog-assets/original/'+p.name
            variants.append({'src':social,'width':1200,'height':630,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
        kind,tag=motif_for(record)
        if record['layout'] in ('station','negative'):kind=record['layout']
        if cover:kind='book' if 'archive' in record['id'] else 'split'
        visual={'station':'a geometric station scene with a clock and three figures','negative':'one figure on a cliff beside a large open sea'}.get(record['layout'],{'orbit':'a planet and orbital paths','signal':'a radio signal','lens':'a magnifying glass','city':'a geometric city','train':'a train and city','helix':'a double helix','clock':'a clock','maze':'a geometric maze','network':'connected nodes','split':'overlapping rectangles','sea':'a boat and waves','island':'an island and waves','bridge':'a bridge','rain':'rain and a building','forest':'trees and a path','mountains':'mountains and a path','door':'an open door','gate':'an arch and columns','book':'an open book','keys':'a key','scales':'a balance scale','chess':'a chess pawn and board','dinner':'a dinner place setting','stage':'a theatre stage'}.get(kind,'abstract editorial symbols'))
        entry={'src':'/blog-assets/original/'+stem+'.webp','width':w,'height':h,'alt':f"Original Hard Quiz illustration for {record['title']}: {visual}.",'caption':f"{record['title']}: original Hard Quiz editorial illustration; not a film still or official poster."}
        if social:entry['social']=social;entry['listing']='/blog-assets/original/'+stem+'-640.webp'
        metadata[record['id']]=entry;manifest.append({'id':record['id'],'article':record['article'],'title':record['title'],'basis':'original_code_artwork','sourceCode':'docs/blog/artwork/editorial-illustrations.py','brief':'docs/blog/artwork/blog-editorial-artwork.json','externalImagery':False,'motif':kind,'outputs':variants})
        thumb=im.copy();thumb.thumbnail((230,165));thumbs.append((record['id'],thumb))
    (ROOT/'frontend/src/blog/originalArtwork.json').write_text(json.dumps(metadata,indent=2)+'\n')
    (ROOT/'docs/blog/original-artwork-manifest.json').write_text(json.dumps({'generatedOn':'2026-11-09','provenance':'New original geometric artwork drawn from repository code. No external photos, frames, posters, character likenesses or brand logos; no legal or advertising approval guarantee.','artworks':manifest},indent=2)+'\n')
    sheet=Image.new('RGB',(6*250,math.ceil(len(thumbs)/6)*205),'#e4e5e7');draw=ImageDraw.Draw(sheet)
    for index,(label,thumb) in enumerate(thumbs):
        x=(index%6)*250;y=(index//6)*205;sheet.paste(thumb,(x+(250-thumb.width)//2,y));draw.text((x+8,y+168),label[:29],font=font(10),fill='#13202e')
    sheet.save('/workspace/scratch/badc028c634f/image-rights-research/contact-sheet.jpg')
    print(json.dumps({'artworks':len(manifest),'files':sum(len(x['outputs']) for x in manifest),'bytes':sum(o['bytes'] for x in manifest for o in x['outputs'])}))


if __name__=='__main__':
    main()
