"""Register generated transparent head layers on the existing equipment canvas.

Usage: python tools/art/prepare-hero-heads.py SOURCE_DIR
SOURCE_DIR contains male/female-idle.png and male/female-moods.png (happy | sad).
This only crops, resamples and registers layers; facial expressions are authored in the sources.
"""
from pathlib import Path
import sys
from PIL import Image

OUT = Path(__file__).resolve().parents[2] / 'public/art/hero/v2'


def register(source, target):
    source = source.convert('RGBA')
    # Ignore nearly transparent pixels when finding the registration bounds.
    alpha = source.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError('Empty head layer')
    head = source.crop(bounds).resize((96, 94), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (192, 256))
    canvas.paste(head, (48, 30))
    canvas.save(target, 'WEBP', lossless=True)


if __name__ == '__main__':
    source_dir = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for body in ('male', 'female'):
        register(Image.open(source_dir / f'{body}-idle.png'), OUT / f'{body}-idle.webp')
        sheet = Image.open(source_dir / f'{body}-moods.png')
        for column, mood in enumerate(('happy', 'sad')):
            w, h = sheet.size
            register(sheet.crop((column*w//2, 0, (column+1)*w//2, h)), OUT / f'{body}-{mood}.webp')
