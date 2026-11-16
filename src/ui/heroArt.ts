// The player's hero from generated art: the layers in public/art (base body per skin tone, v2 heads, hair, worn items)
// stacked on a 192×256 canvas, the 48×64 design at 4×, in the same order the code drawing uses. The hair is painted
// in brown and the eyes in dark blue-violet; both are recoloured here to the hero's own colours. Until every layer
// a hero needs has loaded (or when one is missing), the hero is drawn in code (hero.ts); `useHeroArt` changes when
// more layers arrive, so the pictures update.
import { create } from 'zustand';
import { ART_HERO, ART_WORN } from '../data/art';
import { EYES, ITEMS, SKINS } from '../data/gear';
import type { HeroLook, HeroMood, Outfit } from './hero';
import { bodyWidthAt } from './heroRig';
import { composeAdventureFigure } from './heroPose';
import { heroHairTop } from './heroLayers';

const W = 192;
const H = 256;

export const useHeroArt = create<{ version: number }>(() => ({ version: 0 }));

const images = new Map<string, HTMLImageElement | 'loading' | 'failed'>();
const art = (rel: string) => `${import.meta.env.BASE_URL}art/${rel}.webp`;

/** The image for a layer if it has loaded; starts loading it otherwise. */
function layer(rel: string): HTMLImageElement | null {
  const hit = images.get(rel);
  if (hit instanceof HTMLImageElement) return hit;
  if (hit) return null;
  if (typeof Image === 'undefined') return null;
  images.set(rel, 'loading');
  const img = new Image();
  img.onload = () => {
    images.set(rel, img);
    useHeroArt.setState((s) => ({ version: s.version + 1 }));
  };
  img.onerror = () => images.set(rel, 'failed');
  img.src = art(rel);
  return null;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (r: number, g: number, b: number) => 0.3 * r + 0.59 * g + 0.11 * b;

/** Hue (degrees) and saturation of a colour. */
function hueSat(r: number, g: number, b: number): [number, number] {
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (!d) return [0, 0];
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, d / mx];
}
/** The painted eyes: the dark blue-violet iris (the outlines and mouth are brown, the light catch white). */
const isIris = (r: number, g: number, b: number) => {
  const [h, s] = hueSat(r, g, b);
  return h >= 225 && h <= 295 && s >= 0.2;
};

const recolourCache = new Map<string, HTMLCanvasElement>();
/** A layer in another colour: each pixel picked (all of them, or those `only` accepts) keeps its lightness relative
 * to the painted colour; with `keepDark`, the darkest pixels (the outline) stay as they are. */
function recoloured(img: CanvasImageSource, key: string, color: string, only?: (r: number, g: number, b: number) => boolean, keepDark = true): HTMLCanvasElement | null {
  const hit = recolourCache.get(`${key}:${color}`);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H);
  const px = data.data;
  const ls: number[] = [];
  const picked = (i: number) => px[i + 3] > 0 && (!only || only(px[i], px[i + 1], px[i + 2]));
  for (let i = 0; i < px.length; i += 4) if (picked(i)) ls.push(lum(px[i], px[i + 1], px[i + 2]));
  ls.sort((a, b) => a - b);
  const mid = ls[Math.floor(ls.length / 2)] || 1;
  const [tr, tg, tb] = rgb(color);
  for (let i = 0; i < px.length; i += 4) {
    if (!picked(i)) continue;
    const l = lum(px[i], px[i + 1], px[i + 2]);
    if (keepDark && l < mid * 0.45) continue; // outline
    const k = l / mid;
    px[i] = Math.min(255, tr * k);
    px[i + 1] = Math.min(255, tg * k);
    px[i + 2] = Math.min(255, tb * k);
  }
  ctx.putImageData(data, 0, 0);
  recolourCache.set(`${key}:${color}`, c);
  return c;
}

const itemId = (a: Outfit[keyof Outfit]) => (a ? ITEMS.find((i) => i.art === a)?.id : undefined);

const urls = new Map<string, string>();
/** The hero as a PNG data URL from the generated art, or null (not all layers there or loaded yet: draw in code). */
export function heroArtUrl(look: HeroLook, outfit: Outfit, mood: HeroMood): string | null {
  if (typeof document === 'undefined' || !ART_HERO.has('base')) return null;
  const skin = SKINS.indexOf(look.skin);
  if (skin < 0 || look.beard || look.face) return null;
  const hairTop = heroHairTop(outfit.head?.kind);
  const hair = look.hairStyle !== 'none' && Number.isFinite(hairTop) ? look.hairStyle : null;
  if (hair && !ART_HERO.has(`hair-${hair}`)) return null;
  if (!ART_HERO.has(`face-${mood}`)) return null;
  const order = (['legs', 'body', 'face', 'head', 'main', 'off'] as const).map((slot) => [slot, itemId(outfit[slot])] as const);
  if (order.some(([slot, id]) => outfit[slot] && (!id || !ART_WORN.has(id)))) return null;
  const body = look.body ?? 'male';
  const key = JSON.stringify([body, skin, hair, look.hair, look.eyes, mood, order]);
  const done = urls.get(key);
  if (done) return done;

  const base = layer(`hero/base-${skin}`);
  const face = layer(`hero/v2/${body}-${mood}`);
  const hairImg = hair ? layer(`hero/hair-${hair}`) : null;
  const worn = order.map(([slot, id]) => [slot, id ? layer(`worn/${id}`) : null] as const);
  if (!base || !face || (hair && !hairImg) || worn.some(([slot, img]) => outfit[slot] && !img)) return null;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const draw = (img: CanvasImageSource | null) => img && ctx.drawImage(img, 0, 0, W, H);
  const paintedHair = hair && hairImg ? recoloured(hairImg, `hair-${hair}`, look.hair) : null;
  // Loose hair and ponytails sit behind clothes; braids hang over the shoulders in front.
  if (paintedHair && hair !== 'braids') ctx.drawImage(paintedHair, 0, 116, W, H - 116, 0, 116, W, H - 116);
  const fitted = (img: CanvasImageSource | null, start = 0) => {
    if (!img) return;
    for (let y = start; y < H; y++) {
      const width = W * bodyWidthAt(body, y / 4);
      ctx.drawImage(img, 0, y, W, 1, (W - width) / 2, y, width, 1);
    }
  };
  // Keep the existing neck, hands, feet and equipment anchors. The old blank head is replaced.
  fitted(base, 116);
  const wornImg = (slot: string) => worn.find(([s]) => s === slot)?.[1] ?? null;
  fitted(wornImg('legs'));
  fitted(wornImg('body'));
  if (paintedHair && hair === 'braids') ctx.drawImage(paintedHair, 0, 116, W, H - 116, 0, 116, W, H - 116);
  // Worn clothes can cover the base's hands (especially long cloaks). Restore just the
  // exposed hands before posing; the compositor then places fingers over item grips.
  // Armour supplies its own gauntlets and must keep those instead of bare skin.
  if (!['armor', 'plate'].includes(outfit.body?.kind ?? '')) {
    ctx.drawImage(base, 47, 165, 18, 16, 47, 165, 18, 16);
    ctx.drawImage(base, 127, 165, 18, 16, 127, 165, 18, 16);
  }
  const headKey = `v2-${body}-${mood}`;
  const skinPixels = (r: number, g: number, b: number) => {
    const [h, s] = hueSat(r, g, b);
    return h >= 10 && h <= 45 && s > 0.2 && lum(r, g, b) > 80;
  };
  const head = recoloured(face, `${headKey}-skin`, look.skin, skinPixels) ?? face;
  draw(look.eyes && look.eyes !== EYES[0] ? recoloured(head, `${headKey}-${look.skin}-eyes`, look.eyes, isIris, false) : head);
  if (paintedHair) ctx.drawImage(paintedHair, 0, hairTop, W, 116 - hairTop, 0, hairTop, W, 116 - hairTop);
  draw(wornImg('face'));
  draw(wornImg('head'));
  const pose = { main: outfit.main?.kind, off: outfit.off?.kind };
  const final = composeAdventureFigure(c, pose, wornImg('main'), wornImg('off'));
  const url = final.toDataURL('image/png');
  urls.set(key, url);
  return url;
}
