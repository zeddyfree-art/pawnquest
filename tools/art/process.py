"""Turns generated art (the art kit's results/) into the game's files in public/art/, and writes the manifest
src/data/art.ts. Run: python3 tools/art/process.py <results dir> [more results dirs…]

- Portrait sheets (NN-<id>-portrait.png, a 2x2 grid: idle, thinking / smug, defeated) become one square per mood.
- Figures (NN-<id>-figure.png on magenta) lose the magenta and keep the 3:4 canvas, so the feet stay on the line.
- Map regions (map/region-<world>.png) are kept when their shape matches the region on the map.
Everything is scaled down smoothly (the generated art has no exact pixel grid to snap to) and saved as WebP."""
import json, os, re, sys
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'art')
PORTRAIT = 192  # per mood; shown at up to 128 css px
FIGURE = (144, 192)  # 3:4; shown at 48x64 on the map, larger on the rivals list
MAP_W = 576  # 4x the map's 144-pixel width
# Region bands on the map (144 wide): their height there, to check a generated region's shape.
MAP_BANDS = {'training': 79, 'gutter': 315, 'village': 315, 'castle': 315, 'wilds': 315, 'underworld': 315, 'throne': 79}
MOODS = ['idle', 'thinking', 'smug', 'defeated']


def save(img, rel, quality=86):
    """WebP: a fraction of the size of PNG for this painted kind of pixel art; transparency is kept."""
    path = os.path.join(OUT, rel.replace('.png', '.webp'))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', quality=quality, method=6)


def unmagenta(img):
    """Magenta (and the pink fringe the generator leaves along outlines) becomes transparent."""
    a = np.asarray(img.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    key = (r > 150) & (b > 150) & (g < 110) & (np.abs(r - b) < 90)
    rgba = np.dstack([a, np.where(key, 0, 255)]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def shrink_rgba(img, size):
    """Scale down with straight alpha: colours from opaque pixels only, then a hard alpha edge."""
    a = np.asarray(img).astype(float)
    alpha = a[..., 3:4] / 255
    pre = Image.fromarray(np.dstack([a[..., :3] * alpha, a[..., 3]]).astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS)
    p = np.asarray(pre).astype(float)
    al = p[..., 3:4] / 255
    rgb = np.where(al > 0.01, p[..., :3] / np.maximum(al, 0.01), 0).clip(0, 255)
    hard = np.where(p[..., 3] >= 128, 255, 0)
    return Image.fromarray(np.dstack([rgb, hard]).astype(np.uint8), 'RGBA')


def main(dirs):
    art = {'portraits': [], 'figures': [], 'mapRegions': []}
    for d in dirs:
        for root, _, files in os.walk(d):
            for fn in sorted(files):
                path = os.path.join(root, fn)
                m = re.match(r'\d+-([a-z0-9-]+)-(portrait|figure)\.png$', fn)
                if m:
                    cid, kind = m.groups()
                    img = Image.open(path).convert('RGB')
                    if kind == 'portrait':
                        w, h = img.size
                        inset = round(w * 0.004)
                        for k, mood in enumerate(MOODS):
                            x0, y0 = (k % 2) * w // 2, (k // 2) * h // 2
                            cell = img.crop((x0 + inset, y0 + inset, x0 + w // 2 - inset, y0 + h // 2 - inset))
                            save(cell.resize((PORTRAIT, PORTRAIT), Image.LANCZOS), f'rivals/{cid}-{mood}.png')
                        art['portraits'].append(cid)
                    else:
                        save(shrink_rgba(unmagenta(img), FIGURE), f'figures/{cid}.png')
                        art['figures'].append(cid)
                    continue
                m = re.match(r'region-([a-z]+)\.png$', fn)
                if m and m.group(1) in MAP_BANDS:
                    world = m.group(1)
                    img = Image.open(path).convert('RGB')
                    want = MAP_BANDS[world] / 144
                    got = img.height / img.width
                    if abs(got / want - 1) > 0.08:
                        print(f'skip map region {world}: shape {got:.2f} instead of {want:.2f} (height/width)')
                        continue
                    save(img.resize((MAP_W, round(MAP_W * want)), Image.LANCZOS), f'map/{world}.png')
                    art['mapRegions'].append(world)
    for k in art:
        art[k] = sorted(set(art[k]))
    with open(os.path.join(ROOT, 'src', 'data', 'art.ts'), 'w') as f:
        f.write('// Generated art in public/art/ (tools/art/process.py writes this file). What is not listed is drawn in code.\n')
        for k, v in art.items():
            name = re.sub('([A-Z])', lambda c: '_' + c.group(1), k).upper()
            f.write(f'export const ART_{name} = new Set<string>({json.dumps(v)});\n')
    print({k: len(v) for k, v in art.items()})


if __name__ == '__main__':
    main(sys.argv[1:])
