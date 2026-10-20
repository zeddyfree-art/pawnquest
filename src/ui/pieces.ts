// The default piece set: 64×64 pixel art drawn in code. Each piece is a set of smooth shapes (in a 32-unit space,
// rasterised at 64 pixels); the shading comes from the shape itself: for every pixel the direction of the nearest
// edge decides how much light it catches from the top left, which gives the pieces a rounded, carved look.
// A two-pixel outline in a warm dark keeps them readable at phone size; gold details mark king, queen and bishop.
import type { Role } from 'chessops/types';

export const PIECE_SIZE = 64;
const S = PIECE_SIZE / 32;

type Shape = (x: number, y: number) => boolean;
const rect = (x0: number, y0: number, x1: number, y1: number): Shape => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
const half = (y0: number, y1: number, w0: number, w1: number): Shape => (x, y) => y >= y0 && y < y1 && Math.abs(x - 16) < w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const polygon = (pts: [number, number][]): Shape => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** A thick line segment (for slits and notches). */
const segment = (x0: number, y0: number, x1: number, y1: number, w: number): Shape => (x, y) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= w / 2;
};
const any = (...s: Shape[]): Shape => (x, y) => s.some((f) => f(x, y));
const minus = (a: Shape, ...b: Shape[]): Shape => (x, y) => a(x, y) && !b.some((f) => f(x, y));

const base = any(half(23.5, 25.5, 7.5, 8.5), rect(5.5, 25.5, 26.5, 29));

interface Design {
  body: Shape;
  /** Parts drawn in gold. */
  gold?: Shape;
  /** Dark carved lines inside the body (eyes, slits). */
  carve?: Shape;
}

const DESIGNS: Record<Role, Design> = {
  pawn: { body: any(ellipse(16, 9, 5.3, 5.3), rect(13.2, 13, 18.8, 15.5), ellipse(16, 15.8, 6.6, 1.7), half(16.5, 23.5, 3.6, 7), base) },
  rook: {
    body: minus(any(rect(7, 3.5, 25, 9.5), rect(8.5, 9.5, 23.5, 11), rect(10.2, 11, 21.8, 21.5), half(21.5, 23.5, 6.3, 7.5), base), rect(11, 3, 13.4, 6.5), rect(18.6, 3, 21, 6.5)),
    carve: any(rect(15, 14, 17, 17.5)),
  },
  bishop: {
    body: any(ellipse(16, 3.2, 2, 2), ellipse(16, 11.6, 6.6, 7.6), ellipse(16, 19.4, 7, 1.6), half(20, 23.5, 4, 7), base),
    gold: ellipse(16, 3.2, 2, 2),
    carve: segment(18.8, 6.8, 13.6, 12.6, 1.1),
  },
  knight: {
    body: any(
      polygon([[8, 24], [9, 19], [13, 15.5], [10, 14.6], [6, 15.6], [3.8, 13.2], [4.8, 10], [9.6, 6], [11.8, 2], [14.8, 4.8], [18, 2.4], [19.2, 6], [23.2, 8.8], [25.8, 14], [25.8, 19], [24, 24]]),
      base,
    ),
    carve: any(ellipse(11.6, 9.2, 1.1, 1.1), ellipse(5.6, 13, 0.7, 0.7), segment(19.6, 7.5, 23.4, 13.5, 0.8), segment(21.2, 7.5, 24.6, 15, 0.6)),
  },
  queen: {
    body: any(
      ...[5, 10.5, 16, 21.5, 27].map((x) => ellipse(x, 4, 2, 2)),
      polygon([[3.8, 5], [9, 13], [10.5, 5.5], [13.6, 12], [16, 5.5], [18.4, 12], [21.5, 5.5], [23, 13], [28.2, 5], [24.2, 15.4], [7.8, 15.4]]),
      half(15.4, 16.8, 8, 7),
      half(16.8, 23.5, 5, 8),
      base,
    ),
    gold: any(...[5, 10.5, 16, 21.5, 27].map((x) => ellipse(x, 4, 2, 2)), rect(8.5, 14, 23.5, 15.4)),
  },
  king: {
    body: any(rect(15, 0.8, 17, 8), rect(12.2, 2.8, 19.8, 4.6), minus(ellipse(16, 13.4, 9.2, 5.2), rect(0, 13.4, 32, 32)), rect(7.6, 13.4, 24.4, 15.8), half(15.8, 23.5, 5, 8), base),
    gold: any(rect(15, 0.8, 17, 8), rect(12.2, 2.8, 19.8, 4.6), rect(7.6, 13.4, 24.4, 15.8)),
  },
};

const COLORS = {
  white: { line: '#4a2a17', deep: '#b98f61', shade: '#d9b98d', base: '#f3e2c0', light: '#fbf1dc', high: '#ffffff', carve: '#8a6040' },
  black: { line: '#1c1020', deep: '#2a1932', shade: '#3c2848', base: '#54405e', light: '#73597e', high: '#a08aaa', carve: '#160c1a' },
};
const GOLD = { deep: '#9c6a1c', shade: '#cf8f2a', base: '#f2b33d', light: '#f8cf6a', high: '#fff2b8' };

/** RGBA pixels of one piece. */
export function renderPiece(role: Role, color: 'white' | 'black'): Uint8ClampedArray {
  const N = PIECE_SIZE;
  const d = DESIGNS[role];
  const at = (f: Shape | undefined, x: number, y: number) => !!f && f((x + 0.5) / S, (y + 0.5) / S);
  const inside: boolean[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) inside.push(at(d.body, x, y));
  const isIn = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && inside[y * N + x];
  const out = new Uint8ClampedArray(N * N * 4);
  const put = (x: number, y: number, hex: string) => {
    const i = (y * N + x) * 4;
    out[i] = parseInt(hex.slice(1, 3), 16);
    out[i + 1] = parseInt(hex.slice(3, 5), 16);
    out[i + 2] = parseInt(hex.slice(5, 7), 16);
    out[i + 3] = 255;
  };
  const c = COLORS[color];
  const R = 4;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!isIn(x, y)) {
        // Two-pixel outline.
        let near = false;
        for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3 && isIn(x + dx, y + dy)) near = true;
        if (near) put(x, y, c.line);
        continue;
      }
      // Outward direction: the average direction to empty pixels nearby.
      let ox = 0;
      let oy = 0;
      let edge = 99;
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          if ((dx || dy) && !isIn(x + dx, y + dy)) {
            const len = Math.hypot(dx, dy);
            if (len > R) continue;
            ox += dx / len;
            oy += dy / len;
            edge = Math.min(edge, len);
          }
        }
      const len = Math.hypot(ox, oy) || 1;
      const lit = edge > R ? 0.05 : (-(ox / len) * 0.7 - (oy / len) * 0.7) * (1.15 - edge / (R + 1));
      const tone = at(d.gold, x, y) ? GOLD : c;
      let col = lit > 0.55 ? tone.high : lit > 0.18 ? tone.light : lit < -0.45 ? tone.deep : lit < -0.12 ? tone.shade : tone.base;
      // The plinth sits in a little shadow.
      if (y >= 25.5 * S && col === tone.base) col = tone.shade;
      if (at(d.carve, x, y)) col = c.carve;
      put(x, y, col);
    }
  return out;
}

const cache = new Map<string, string>();
/** A PNG data URL of the piece (browser only; empty string elsewhere). */
export function pieceDataUrl(role: Role, color: 'white' | 'black'): string {
  const key = role + color;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PIECE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(new ImageData(renderPiece(role, color) as Uint8ClampedArray<ArrayBuffer>, PIECE_SIZE, PIECE_SIZE), 0, 0);
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export const ROLES: Role[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

/** CSS that gives chessground these pieces. */
export function piecesCss(): string {
  return ROLES.flatMap((r) => (['white', 'black'] as const).map((c) => `.cg-wrap piece.${r}.${c}{background-image:url("${pieceDataUrl(r, c)}")}`)).join('\n');
}
