// Pixel art made in code: the shared palette and the placeholder character portraits (pieces: pieces.ts).
// One palette for everything (from Endesga 32).
import type { Faction } from '../data/characters';
import { FACTIONS } from '../data/characters';

export const PALETTE = {
  ink: '#181425',
  night: '#262b44',
  slate: '#3a4466',
  steel: '#5a6988',
  fog: '#8b9bb4',
  bone: '#c0cbdc',
  parchment: '#f4ead6',
  sand: '#ead4aa',
  tan: '#e4a672',
  clay: '#b86f50',
  bark: '#733e39',
  gold: '#feae34',
};

// ---------- placeholder portraits ----------
function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A mirrored 12×12 bust seeded from the name, in faction colours. Replaced by drawn portraits later. */
export function drawPortrait(canvas: HTMLCanvasElement, name: string, faction: Faction) {
  const W = 12;
  const H = 12;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let seed = hash(name);
  const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  const f = FACTIONS[faction];
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, W, H);
  const skin = [PALETTE.sand, PALETTE.tan, PALETTE.clay, PALETTE.bark][Math.floor(rnd() * 4)];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W / 2; x++) {
      let col: string | null = null;
      if (y < 4) col = x >= 1 && rnd() < 0.6 ? f.color : rnd() < 0.25 ? f.accent : null; // hood, hair, hat
      else if (y < 9) col = x >= 3 ? (rnd() < 0.88 ? skin : f.accent) : rnd() < 0.55 ? f.color : null; // face
      else col = x >= 1 ? (rnd() < 0.8 ? f.color : f.accent) : null; // shoulders
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
        ctx.fillRect(W - 1 - x, y, 1, 1);
      }
    }
  ctx.fillStyle = PALETTE.ink;
  const ey = 5 + Math.floor(rnd() * 2);
  ctx.fillRect(4, ey, 1, 1);
  ctx.fillRect(W - 5, ey, 1, 1);
  if (rnd() < 0.5) {
    ctx.fillStyle = PALETTE.bark;
    ctx.fillRect(5, ey + 2, 2, 1); // mouth
  }
}
