// Board themes, drawn in code: every square gets its own texture (wood grain, cobbles, flagstones, moss, basalt,
// marble), from a seeded random source so the board looks the same every time. Each region has its own board;
// the player can pick another in Profile → Settings.
import type { WorldId } from '../data/characters';

export type BoardThemeId = 'wood' | 'cobble' | 'stone' | 'forest' | 'obsidian' | 'marble' | 'meadow' | 'campfire' | 'starfall' | 'library';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  light: string;
  dark: string;
  /** Colour of the frame around the board. */
  frame: string;
  texture: 'grain' | 'cobble' | 'flag' | 'moss' | 'basalt' | 'marble' | 'straw';
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'meadow', name: 'Meadow', light: '#f3e2b0', dark: '#9fbf63', frame: '#b07a4b', texture: 'straw' },
  { id: 'wood', name: 'Oak', light: '#f0d3a6', dark: '#b0784c', frame: '#7d4f2c', texture: 'grain' },
  { id: 'cobble', name: 'Cobblestone', light: '#d8d0c2', dark: '#8f8577', frame: '#5d5145', texture: 'cobble' },
  { id: 'stone', name: 'Castle stone', light: '#dfe2e6', dark: '#8c97a8', frame: '#5c6475', texture: 'flag' },
  { id: 'forest', name: 'Forest moss', light: '#dcebb5', dark: '#5e9b45', frame: '#4e6b34', texture: 'moss' },
  { id: 'obsidian', name: 'Obsidian', light: '#e3b39a', dark: '#7a5154', frame: '#2c1c24', texture: 'basalt' },
  { id: 'marble', name: 'Royal marble', light: '#f2e9f2', dark: '#9c7aa8', frame: '#5c3f66', texture: 'marble' },
  { id: 'campfire', name: 'Campfire', light: '#f6d9a8', dark: '#c46a3a', frame: '#5a3020', texture: 'grain' },
  { id: 'starfall', name: 'Starfall', light: '#c9d4f0', dark: '#4a5a9a', frame: '#1e2448', texture: 'marble' },
  { id: 'library', name: 'Library', light: '#ead9b8', dark: '#7a5a42', frame: '#3b2617', texture: 'grain' },
];

export const REGION_BOARD: Record<WorldId, BoardThemeId> = {
  training: 'meadow',
  gutter: 'cobble',
  village: 'wood',
  castle: 'stone',
  wilds: 'forest',
  underworld: 'obsidian',
  throne: 'marble',
};

export const boardTheme = (id: BoardThemeId) => BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[1];

function rng(seed: number) {
  return () => ((seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0) % 100000) / 100000;
}
function shadeHex(hex: string, f: number): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)];
}

const SQ = 32;

/** RGBA pixels of a 256×256 board (8×8 squares of 32 px), a1 at the bottom left. */
export function renderBoard(t: BoardTheme): Uint8ClampedArray {
  const W = SQ * 8;
  const out = new Uint8ClampedArray(W * W * 4);
  const put = (x: number, y: number, c: [number, number, number]) => {
    const i = (y * W + x) * 4;
    out[i] = c[0];
    out[i + 1] = c[1];
    out[i + 2] = c[2];
    out[i + 3] = 255;
  };
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const light = (r + f) % 2 === 1; // a1 is a dark square
      const baseHex = light ? t.light : t.dark;
      const rnd = rng(1 + r * 31 + f * 7 + (light ? 1000 : 0) + t.id.length * 97);
      const grid: number[] = new Array(SQ * SQ).fill(0); // brightness offsets
      const add = (x: number, y: number, v: number) => {
        if (x >= 0 && y >= 0 && x < SQ && y < SQ) grid[y * SQ + x] += v;
      };
      switch (t.texture) {
        case 'grain': {
          // Planks running up the board, with darker grain lines and a knot now and then.
          for (let x = 0; x < SQ; x++) {
            const band = Math.sin(x * 0.9 + rnd() * 6) * 0.03;
            for (let y = 0; y < SQ; y++) add(x, y, band + (rnd() - 0.5) * 0.03);
          }
          for (let k = 0; k < 4; k++) {
            const x0 = Math.floor(rnd() * SQ);
            for (let y = 0; y < SQ; y++) add(x0 + Math.round(Math.sin(y / 5 + k) * 1.2), y, -0.09);
          }
          if (rnd() < 0.35) {
            const kx = 6 + Math.floor(rnd() * 20);
            const ky = 6 + Math.floor(rnd() * 20);
            for (let a = 0; a < 20; a++) add(kx + Math.round(Math.cos(a / 3) * 2), ky + Math.round(Math.sin(a / 3) * 3), -0.1);
          }
          break;
        }
        case 'cobble': {
          // Four rounded stones per square, mortar in between.
          const stones = [[8, 8], [24, 8], [8, 24], [24, 24]].map(([cx, cy]) => [cx + (rnd() - 0.5) * 3, cy + (rnd() - 0.5) * 3, 0.06 * (rnd() - 0.5)]);
          for (let y = 0; y < SQ; y++)
            for (let x = 0; x < SQ; x++) {
              let best = 99;
              let tone = 0;
              for (const [cx, cy, tn] of stones) {
                const d = Math.hypot(x - cx, y - cy);
                if (d < best) [best, tone] = [d, tn];
              }
              add(x, y, best > 7.2 ? -0.18 : tone + (best > 6 ? -0.06 : best < 3 ? 0.04 : 0) + (rnd() - 0.5) * 0.04);
            }
          break;
        }
        case 'flag': {
          // A flagstone with a bevel and a crack.
          for (let y = 0; y < SQ; y++)
            for (let x = 0; x < SQ; x++) add(x, y, (x === 0 || y === 0 ? 0.08 : x === SQ - 1 || y === SQ - 1 ? -0.12 : 0) + (rnd() - 0.5) * 0.05);
          if (rnd() < 0.5) {
            let x = Math.floor(rnd() * SQ);
            for (let y = 4; y < 20; y++) {
              x += Math.round(rnd() * 2 - 1);
              add(x, y, -0.12);
            }
          }
          break;
        }
        case 'moss': {
          for (let y = 0; y < SQ; y++) for (let x = 0; x < SQ; x++) add(x, y, (rnd() - 0.5) * 0.08);
          for (let k = 0; k < 7; k++) {
            const x = Math.floor(rnd() * SQ);
            const y = Math.floor(rnd() * SQ);
            add(x, y, 0.12);
            add(x, y - 1, 0.1);
            add(x - 1, y + 1, 0.06);
          }
          if (light && rnd() < 0.4) add(Math.floor(rnd() * SQ), Math.floor(rnd() * SQ), 0.35); // a little flower
          break;
        }
        case 'basalt': {
          for (let y = 0; y < SQ; y++) for (let x = 0; x < SQ; x++) add(x, y, (rnd() - 0.5) * 0.1);
          if (!light)
            for (let k = 0; k < 2; k++) {
              let x = Math.floor(rnd() * SQ);
              for (let y = 0; y < SQ; y++) {
                x += Math.round(rnd() * 2 - 1);
                add(x, y, 0.22);
              }
            }
          break;
        }
        case 'marble': {
          for (let y = 0; y < SQ; y++) for (let x = 0; x < SQ; x++) add(x, y, Math.sin((x + y) / 6 + Math.sin(y / 4) * 2) * 0.03 + (rnd() - 0.5) * 0.02);
          let x = Math.floor(rnd() * SQ);
          for (let y = 0; y < SQ; y++) {
            x += Math.round(rnd() * 2 - 1);
            add(x, y, light ? -0.12 : 0.15);
          }
          break;
        }
        case 'straw': {
          for (let y = 0; y < SQ; y++) for (let x = 0; x < SQ; x++) add(x, y, (rnd() - 0.5) * 0.06 + (light && (x + Math.floor(y / 3)) % 7 === 0 ? -0.05 : 0));
          for (let k = 0; k < 5; k++) add(Math.floor(rnd() * SQ), Math.floor(rnd() * SQ), light ? -0.08 : 0.1);
          break;
        }
      }
      for (let y = 0; y < SQ; y++)
        for (let x = 0; x < SQ; x++) {
          const v = grid[y * SQ + x];
          // Quantise to a few steps so it stays pixel art rather than noise.
          const q = Math.round(v / 0.04) * 0.04;
          put(f * SQ + x, (7 - r) * SQ + y, shadeHex(baseHex, q));
        }
    }
  return out;
}

const cache = new Map<string, string>();
export function boardDataUrl(t: BoardTheme): string {
  const hit = cache.get(t.id);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SQ * 8;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(new ImageData(renderBoard(t) as Uint8ClampedArray<ArrayBuffer>, SQ * 8, SQ * 8), 0, 0);
  const url = canvas.toDataURL('image/png');
  cache.set(t.id, url);
  return url;
}

/** CSS for every theme: `.board-theme-<id>` on a parent picks the board and its frame colour. */
export function boardsCss(): string {
  return BOARD_THEMES.map(
    (t) => `.board-theme-${t.id} cg-board{background-image:url("${boardDataUrl(t)}");background-size:100% 100%;image-rendering:pixelated}.board-theme-${t.id}{--frame-color:${t.frame}}`,
  ).join('\n');
}
