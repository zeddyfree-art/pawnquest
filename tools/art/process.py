"""Turns generated art (the art kit's results/) into the game's files in public/art/, and writes the manifest
src/data/art.ts. Run: python3 tools/art/process.py <results dir> [more results dirs…]

- Portrait sheets (NN-<id>-portrait.png, a 2x2 grid: idle, thinking / smug, defeated) become one square per mood.
- Figures (NN-<id>-figure.png on magenta) lose the magenta and keep the 3:4 canvas, so the feet stay on the line.
- Map regions (map/region-<world>.png) are kept when their shape matches the region on the map.
- Item icons (items/<slot>/<id>-icon.png) become squares; worn layers (<id>-worn.png) keep the hero's 3:4 canvas.
- The hero: the base body (its painted face removed, one file per skin tone), hair styles and the three faces, all
  on the same 3:4 canvas so the game can stack them with the worn items (src/ui/heroArt.ts).
- Pets (pets/<id>-stage<n>[-scholar<s>].png on magenta), fight backdrops (backdrops/<world>.png), boards
  (boards/<id>.png, 8x8 with a1 dark) and piece sheets (pieces/<set>-<color>.png: a 3x2 grid, king queen rook /
  bishop knight pawn) become one file each, the sheets one file per piece.
- The app icon (icons/app-icon.png, a rounded tile on magenta) becomes public/icon-192/512.png (transparent corners),
  apple-touch-icon.png (cropped to the inside of the tile, so it fills the square) and icon-maskable-512.png (that
  crop in the middle 82%, on the tile's wood).
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
ICON = 128
HERO = (192, 256)
PET = 128  # shown at up to about 65 css px
BACKDROP = (384, 480)  # 3x the 128x160 backdrop
BOARD = 512
PIECE = 128  # shown at up to about 64 css px
ROLES = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']  # the hero's 48x64 design at 4x; shown at up to 160 css px tall
# The skin tones a hero can pick (src/data/gear.ts SKINS); the generated base body is painted in the third.
SKINS = ['#f6dccb', '#f6d3b3', '#efc29a', '#d99a6c', '#b06f45', '#7a4a2f']


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


def hsv(a):
    """Hue (degrees), saturation and value of an RGB array (0-255)."""
    f = a.astype(float) / 255
    mx, mn = f.max(-1), f.min(-1)
    d = mx - mn
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(d == 0, 0, np.where(mx == r, (g - b) / np.maximum(d, 1e-6) % 6, np.where(mx == g, (b - r) / np.maximum(d, 1e-6) + 2, (r - g) / np.maximum(d, 1e-6) + 4))) * 60
    return h, np.where(mx == 0, 0, d / np.maximum(mx, 1e-6)), mx


def hero_bases(path):
    """The base body without its painted face (the face layers draw one), in every skin tone."""
    img = unmagenta(Image.open(path))
    a = np.asarray(img).astype(float)
    rgb, alpha = a[..., :3], a[..., 3]
    h, w = alpha.shape
    U = w / 48  # one design unit
    hue, sat, val = hsv(rgb)
    ys, xs = np.mgrid[0:h, 0:w]
    skin = (alpha > 0) & (hue >= 12) & (hue <= 33) & (sat >= 0.28) & (sat <= 0.68) & (val >= 0.6) & (ys < 53.4 * U)
    skin &= ~((xs > 17 * U) & (xs < 31 * U) & (ys > 43.5 * U) & (ys < 48.7 * U))  # the shorts' seams
    # The face: inside the head, around the eyes and mouth, everything that is not plain skin becomes the skin of
    # its row (so the light from the top stays).
    face = ((xs - 24 * U) / (7.6 * U)) ** 2 + ((ys - 21.5 * U) / (5.6 * U)) ** 2 < 1
    for y in range(int(15 * U), int(27.5 * U)):
        row = skin[y] & face[y]
        if row.sum() < 4:
            continue
        tone = np.median(rgb[y][row], axis=0)
        fix = face[y] & ~skin[y] & (alpha[y] > 0)
        rgb[y][fix] = tone
        skin[y][fix] = True
    ref = np.array([244, 192, 145], float)
    for i, hexc in enumerate(SKINS):
        target = np.array([int(hexc[k:k + 2], 16) for k in (1, 3, 5)], float)
        out = rgb.copy()
        lum = (rgb[skin] @ [0.3, 0.59, 0.11]) / (ref @ [0.3, 0.59, 0.11])
        out[skin] = np.clip(target * lum[:, None], 0, 255)
        yield i, Image.fromarray(np.dstack([out, alpha]).astype(np.uint8), 'RGBA')


def main(dirs):
    art = {'portraits': [], 'figures': [], 'mapRegions': [], 'icons': [], 'worn': [], 'hero': [], 'pets': [], 'backdrops': [], 'boards': [], 'pieces': []}
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
                m = re.match(r'([a-z0-9-]+)-(icon|worn)\.png$', fn)
                if m and '/items' in root:
                    iid, kind = m.groups()
                    img = unmagenta(Image.open(path))
                    if kind == 'icon':
                        save(shrink_rgba(img, (ICON, ICON)), f'items/{iid}.png')
                        art['icons'].append(iid)
                    else:
                        save(shrink_rgba(img, HERO), f'worn/{iid}.png')
                        art['worn'].append(iid)
                    continue
                if root.endswith('/hero') and fn == 'base-body.png':
                    for i, im in hero_bases(path):
                        save(shrink_rgba(im, HERO), f'hero/base-{i}.png')
                    art['hero'].append('base')
                    continue
                if root.endswith('/hero/hair') or root.endswith('/hero/face'):
                    part = os.path.basename(root)
                    save(shrink_rgba(unmagenta(Image.open(path)), HERO), f'hero/{part}-{fn[:-4]}.png')
                    art['hero'].append(f'{part}-{fn[:-4]}')
                    continue
                folder = os.path.basename(root)
                if folder == 'pets' and fn.endswith('.png'):
                    save(shrink_rgba(unmagenta(Image.open(path)), (PET, PET)), f'pets/{fn}')
                    art['pets'].append(fn[:-4])
                    continue
                if folder == 'backdrops' and fn.endswith('.png'):
                    save(Image.open(path).convert('RGB').resize(BACKDROP, Image.LANCZOS), f'backdrops/{fn}')
                    art['backdrops'].append(fn[:-4])
                    continue
                if folder == 'boards' and fn.endswith('.png'):
                    save(Image.open(path).convert('RGB').resize((BOARD, BOARD), Image.LANCZOS), f'boards/{fn}')
                    art['boards'].append(fn[:-4])
                    continue
                m = re.match(r'([a-z]+)-(white|black)\.png$', fn)
                if folder == 'pieces' and m:
                    set_id, color = m.groups()
                    sheet = unmagenta(Image.open(path))
                    cw, ch = sheet.width // 3, sheet.height // 2
                    for k, role in enumerate(ROLES):
                        cell = sheet.crop(((k % 3) * cw, (k // 3) * ch, (k % 3 + 1) * cw, (k // 3 + 1) * ch))
                        side = min(cell.size)  # square, centred
                        cell = cell.crop(((cell.width - side) // 2, cell.height - side, (cell.width + side) // 2, cell.height))
                        save(shrink_rgba(cell, (PIECE, PIECE)), f'pieces/{set_id}/{color}-{role}.png')
                    art['pieces'].append(f'{set_id}-{color}')
                    continue
                if fn == 'app-icon.png':
                    tile = unmagenta(Image.open(path))
                    box = tile.getchannel('A').getbbox()
                    tile = tile.crop(box)
                    for size in (192, 512):
                        shrink_rgba(tile, (size, size)).save(os.path.join(ROOT, 'public', f'icon-{size}.png'), optimize=True)
                    w = tile.width
                    inner = tile.convert("RGB").crop((round(w * 0.07), round(w * 0.07), round(w * 0.93), round(w * 0.93)))
                    # Maskable: the launcher may cut it to a circle, so the picture sits in the middle 82% on the tile's wood.
                    wood = tuple(int(v) for v in np.median(np.asarray(inner)[inner.height // 3:inner.height * 2 // 3, : inner.width // 12].reshape(-1, 3), axis=0))
                    mask = Image.new('RGB', (512, 512), wood)
                    mask.paste(inner.resize((420, 420), Image.LANCZOS), (46, 46))
                    mask.save(os.path.join(ROOT, 'public', 'icon-maskable-512.png'), optimize=True)
                    inner.resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'apple-touch-icon.png'), optimize=True)
                    print('app icons written')
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
    # A piece set counts once both colours are there.
    art['pieces'] = [p[:-6] for p in art['pieces'] if p.endswith('-white') and p[:-6] + '-black' in art['pieces']]
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
