"""Optimize the owner's N05 stills without cropping or changing their composition."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

FILMS = [
    ("arrival", "Arrival", "Louise Banks in an orange protective suit holds a board reading HUMAN in Arrival (2016).", "Louise Banks introduces a word in Arrival (2016)."),
    ("moon", "Moon", "GERTY's robotic unit displays a yellow smiling face inside the lunar base in Moon (2009).", "GERTY aboard the lunar base in Moon (2009)."),
    ("coherence", "Coherence", "Em sits at a warmly lit dinner table with friends in Coherence (2013).", "Em at the dinner gathering in Coherence (2013)."),
    ("source-code", "Source Code", "Colter Stevens stands beside another passenger at the doorway of a commuter train in Source Code (2011).", "At a commuter train doorway in Source Code (2011)."),
    ("ex-machina", "Ex Machina", "Ava's face and reflection appear on a glass partition in Ex Machina (2015).", "Ava behind glass in Ex Machina (2015)."),
    ("dark-city", "Dark City", "Three figures in dark coats and hats stand in a dimly lit room in Dark City (1998).", "A shadowy interior in Dark City (1998)."),
    ("minority-report", "Minority Report", "Faces are projected across the curved displays above the Precrime operations room in Minority Report (2002).", "The Precrime operations room in Minority Report (2002)."),
    ("gattaca", "Gattaca", "Vincent sits at a workstation as an older man stands beside him in Gattaca (1997).", "Vincent at work in Gattaca (1997)."),
    ("the-thirteenth-floor", "The Thirteenth Floor", "A cream-colored Checker taxi passes along a busy period street in The Thirteenth Floor (1999).", "A period street scene in The Thirteenth Floor (1999)."),
    ("the-vast-of-night", "The Vast of Night", "Fay and Everett stand outside at night with a microphone between them in The Vast of Night (2020).", "Fay and Everett in The Vast of Night (2020)."),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[3]
    assets = repo / "frontend/public/blog-assets"
    manifest = {"source": "Archive(5).zip, supplied by the site owner on November 6, 2026", "externalSourceLinks": [], "films": []}
    for slug, title, alt, caption in FILMS:
        source = args.source / f"{title}.png"
        with Image.open(source) as original:
            assert original.width >= 1200
            if "A" in original.getbands():
                assert original.getchannel("A").getextrema() == (255, 255)
            image = original.convert("RGB")
            row = {"id": slug, "original": source.name, "originalBytes": source.stat().st_size, "originalSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "originalWidth": image.width, "originalHeight": image.height, "alt": alt, "caption": caption, "variants": []}
            for width in (480, 800, 1200):
                height = round(image.height * width / image.width)
                suffix = "" if width == 1200 else f"-{width}"
                name = f"sci-fi-mystery-{slug}-still{suffix}.webp"
                target = assets / name
                image.resize((width, height), Image.Resampling.LANCZOS).save(target, quality=84, method=6)
                row["variants"].append({"src": "/blog-assets/" + name, "width": width, "height": height, "bytes": target.stat().st_size, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
            manifest["films"].append(row)
    target = repo / "docs/blog/sci-fi-mystery-stills.json"
    target.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    rows = manifest["films"]
    print(json.dumps({"films": len(rows), "originalBytes": sum(r["originalBytes"] for r in rows), "largeWebpBytes": sum(r["variants"][-1]["bytes"] for r in rows), "allWebpBytes": sum(v["bytes"] for r in rows for v in r["variants"])}))


if __name__ == "__main__":
    main()
