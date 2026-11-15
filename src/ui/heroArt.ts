// The player's hero from generated art: the layers in public/art (base body per skin tone, hair, faces, worn items)
// stacked on a 192×256 canvas, the 48×64 design at 4×, in the same order the code drawing uses. The hair is painted
// in brown and recoloured here. Until every layer a hero needs has loaded (or when one is missing), the hero is
// drawn in code (hero.ts); `useHeroArt` changes when more layers arrive, so the pictures update.
import { create } from 'zustand';
import { ART_HERO, ART_WORN } from '../data/art';
import { ITEMS, SKINS } from '../data/gear';
import type { HeroLook, HeroMood, Outfit } from './hero';

const W = 192;
const H = 256;
/** Head gear that covers all the hair (as in the code drawing). */
const HIDES_HAIR = new Set(['hood', 'helmet']);

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

const hairCache = new Map<string, HTMLCanvasElement>();
/** The hair layer in another colour: each pixel keeps its lightness relative to the painted brown; the darkest
 * pixels (the outline) stay as they are. */
function recoloured(img: HTMLImageElement, key: string, color: string): HTMLCanvasElement | null {
  const hit = hairCache.get(`${key}:${color}`);
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
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 0) ls.push(lum(px[i], px[i + 1], px[i + 2]));
  ls.sort((a, b) => a - b);
  const mid = ls[Math.floor(ls.length / 2)] || 1;
  const [tr, tg, tb] = rgb(color);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const l = lum(px[i], px[i + 1], px[i + 2]);
    if (l < mid * 0.45) continue; // outline
    const k = l / mid;
    px[i] = Math.min(255, tr * k);
    px[i + 1] = Math.min(255, tg * k);
    px[i + 2] = Math.min(255, tb * k);
  }
  ctx.putImageData(data, 0, 0);
  hairCache.set(`${key}:${color}`, c);
  return c;
}

const itemId = (a: Outfit[keyof Outfit]) => (a ? ITEMS.find((i) => i.art === a)?.id : undefined);

const urls = new Map<string, string>();
/** The hero as a PNG data URL from the generated art, or null (not all layers there or loaded yet: draw in code). */
export function heroArtUrl(look: HeroLook, outfit: Outfit, mood: HeroMood): string | null {
  if (typeof document === 'undefined' || !ART_HERO.has('base')) return null;
  const skin = SKINS.indexOf(look.skin);
  if (skin < 0 || look.beard || look.face) return null;
  const hair = look.hairStyle !== 'none' && !HIDES_HAIR.has(outfit.head?.kind ?? '') ? look.hairStyle : null;
  if (hair && !ART_HERO.has(`hair-${hair}`)) return null;
  if (!ART_HERO.has(`face-${mood}`)) return null;
  const order = (['legs', 'body', 'face', 'head', 'main', 'off'] as const).map((slot) => [slot, itemId(outfit[slot])] as const);
  if (order.some(([slot, id]) => outfit[slot] && (!id || !ART_WORN.has(id)))) return null;
  const key = JSON.stringify([skin, hair, look.hair, mood, order]);
  const done = urls.get(key);
  if (done) return done;

  const base = layer(`hero/base-${skin}`);
  const face = layer(`hero/face-${mood}`);
  const hairImg = hair ? layer(`hero/hair-${hair}`) : null;
  const worn = order.map(([slot, id]) => [slot, id ? layer(`worn/${id}`) : null] as const);
  if (!base || !face || (hair && !hairImg) || worn.some(([slot, img]) => outfit[slot] && !img)) return null;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  // A soft shadow under the feet, then the layers back to front.
  ctx.fillStyle = 'rgba(59, 38, 23, 0.22)';
  ctx.beginPath();
  ctx.ellipse(W / 2, 57 * 4, 11 * 4, 1.8 * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const draw = (img: CanvasImageSource | null) => img && ctx.drawImage(img, 0, 0, W, H);
  draw(base);
  const wornImg = (slot: string) => worn.find(([s]) => s === slot)?.[1] ?? null;
  draw(wornImg('legs'));
  draw(wornImg('body'));
  draw(face);
  if (hair && hairImg) draw(recoloured(hairImg, hair, look.hair));
  draw(wornImg('face'));
  draw(wornImg('head'));
  draw(wornImg('main'));
  draw(wornImg('off'));
  const url = c.toDataURL('image/png');
  urls.set(key, url);
  return url;
}
