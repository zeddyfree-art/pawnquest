// Shared tools for the art drawn in code (portraits, the hero, pets, item icons): shapes as inside-tests,
// colour shading, and a small pixel canvas that fills a shape with its own darker outline and a light rim.

export type Shape = (x: number, y: number) => boolean;
export type Pt = [number, number];

export const rect = (x0: number, y0: number, x1: number, y1: number): Shape => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
export const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
export const polygon = (pts: Pt[]): Shape => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** A thick line segment. */
export const segment = (x0: number, y0: number, x1: number, y1: number, w: number): Shape => (x, y) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= w / 2;
};
export const any = (...s: Shape[]): Shape => (x, y) => s.some((f) => f(x, y));
export const minus = (a: Shape, ...b: Shape[]): Shape => (x, y) => a(x, y) && !b.some((f) => f(x, y));
export const only = (a: Shape, b: Shape): Shape => (x, y) => a(x, y) && b(x, y);
/** Moves a shape by (dx, dy). */
export const shift = (s: Shape, dx: number, dy: number): Shape => (x, y) => s(x - dx, y - dy);
/** Points plus their mirror image around x = cx (for symmetric outlines, listed left half first). */
export const mirrorAround = (cx: number, pts: Pt[]): Pt[] => [...pts, ...pts.map(([x, y]) => [2 * cx - x, y] as Pt).reverse()];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
/** Lighter (f > 0) or darker (f < 0) shade of a colour. */
export function tone(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return `#${[ch(r), ch(g), ch(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
/** Outline colour for a fill: much darker, nudged towards warm brown so outlines feel soft, never black. */
export function lineOf(hex: string): string {
  const [r, g, b] = hexToRgb(tone(hex, -0.62));
  return `#${[r + 18, g + 6, b].map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('')}`;
}

export interface PartOptions {
  outline?: boolean;
  pattern?: (x: number, y: number) => string | null;
  rim?: boolean;
  /** Only look inside this box [x0, y0, x1, y1] (speeds up small parts on a big canvas). */
  box?: [number, number, number, number];
}

export class Canvas {
  px: (string | null)[];
  constructor(
    readonly w: number,
    readonly h: number = w,
  ) {
    this.px = new Array(w * h).fill(null);
  }
  set(x: number, y: number, c: string) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  get(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null;
  }
  /** Fills a shape with an outline in a darker shade of its colour and a light rim at the top left. */
  part(shape: Shape, fill: string, opts: PartOptions = {}) {
    const { w, h } = this;
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && shape(x + 0.5, y + 0.5);
    const line = lineOf(fill);
    const light = tone(fill, 0.28);
    const shade = tone(fill, -0.16);
    const [bx0, by0, bx1, by1] = opts.box ?? [0, 0, w, h];
    for (let y = Math.max(0, Math.floor(by0)); y < Math.min(h, Math.ceil(by1)); y++)
      for (let x = Math.max(0, Math.floor(bx0)); x < Math.min(w, Math.ceil(bx1)); x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        let c = opts.pattern?.(x, y) ?? fill;
        if (edge && opts.outline !== false) c = line;
        else if (opts.rim !== false && (!inside(x - 1, y - 1) || !inside(x, y - 2))) c = light;
        else if (!inside(x + 2, y + 1) || !inside(x + 1, y + 2)) c = c === fill ? shade : c;
        this.set(x, y, c);
      }
  }
  dot(x: number, y: number, c: string) {
    this.set(x, y, c);
  }
}

/** Pixels (colour strings or null, row by row) as a PNG data URL; empty string outside the browser. */
export function pixelsToUrl(px: (string | null)[], w: number, h: number): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  px.forEach((c, i) => {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(i % w, Math.floor(i / w), 1, 1);
  });
  return canvas.toDataURL('image/png');
}
