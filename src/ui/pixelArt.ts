// Pixel art made in code: the 32×32 chess pieces and the placeholder character portraits.
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

// ---------- pieces ----------
// 32×32 pieces built from simple shapes, so every silhouette is clean and readable at phone size. The outline,
// the light rim (top left) and the shadow (bottom right) are added by code, so all pieces share one light source.
const N = 32;
type Mask = boolean[][];
const blank = (): Mask => Array.from({ length: N }, () => Array<boolean>(N).fill(false));

function rect(m: Mask, x0: number, y0: number, x1: number, y1: number, on = true) {
  for (let y = Math.round(y0); y <= y1; y++) for (let x = Math.round(x0); x <= x1; x++) if (x >= 0 && x < N && y >= 0 && y < N) m[y][x] = on;
}
/** Rows y0..y1, centred on x = 15.5, width going linearly from w0 to w1 (even widths keep it symmetric). */
function taper(m: Mask, y0: number, y1: number, w0: number, w1: number) {
  for (let y = y0; y <= y1; y++) {
    const w = 2 * Math.round((w0 + ((w1 - w0) * (y - y0)) / Math.max(1, y1 - y0)) / 2);
    rect(m, 16 - w / 2, y, 15 + w / 2, y);
  }
}
function ellipse(m: Mask, cx: number, cy: number, rx: number, ry: number, on = true) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) m[y][x] = on;
}
function polygon(m: Mask, pts: [number, number][]) {
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) m[y][x] = true;
    }
}
/** The shared foot: a wide plinth with a step. */
function base(m: Mask) {
  taper(m, 24, 25, 16, 18);
  rect(m, 6, 26, 25, 28);
}

const SHAPES: Record<string, Mask> = (() => {
  const pawn = blank();
  ellipse(pawn, 16, 9, 5, 5);
  rect(pawn, 13, 13, 18, 14);
  taper(pawn, 15, 16, 14, 14);
  taper(pawn, 17, 23, 8, 14);
  base(pawn);

  const rook = blank();
  rect(rook, 7, 4, 24, 9);
  rect(rook, 11, 4, 12, 6, false);
  rect(rook, 19, 4, 20, 6, false);
  rect(rook, 10, 10, 21, 21);
  taper(rook, 22, 23, 14, 16);
  base(rook);

  const bishop = blank();
  ellipse(bishop, 16, 3, 2, 2);
  ellipse(bishop, 16, 11.5, 6.5, 7.5);
  for (let i = 0; i < 6; i++) rect(bishop, 18 - Math.round(i * 0.9), 7 + i, 18 - Math.round(i * 0.9), 7 + i, false); // the mitre's slit
  taper(bishop, 18, 19, 14, 14);
  taper(bishop, 20, 23, 8, 14);
  base(bishop);

  const queen = blank();
  for (const x of [5, 10.5, 16, 21.5, 27]) ellipse(queen, x, 4, 2, 2);
  polygon(queen, [[4, 5], [9, 13], [10.5, 5], [13.5, 12], [16, 5], [18.5, 12], [21.5, 5], [23, 13], [28, 5], [24, 15], [8, 15]]);
  taper(queen, 15, 16, 16, 14);
  taper(queen, 17, 23, 10, 16);
  base(queen);

  const king = blank();
  rect(king, 15, 1, 16, 7);
  rect(king, 12, 3, 19, 4);
  ellipse(king, 16, 13, 9, 5);
  rect(king, 7, 13, 24, 13, false);
  rect(king, 7, 14, 24, 15);
  taper(king, 16, 23, 10, 16);
  base(king);

  const knight = blank();
  polygon(knight, [[8, 24], [9, 19], [13, 15.5], [10, 14.5], [6, 15.5], [4, 13], [5, 10], [10, 6], [12, 2], [15, 5], [18, 2.5], [19, 6], [23, 9], [25.5, 14], [25.5, 19], [24, 24]]);
  rect(knight, 11, 9, 12, 9, false); // eye
  rect(knight, 5, 13, 5, 13, false); // nostril
  base(knight);
  return { pawn, rook, bishop, queen, king, knight };
})();

const PIECE_COLORS = {
  white: { fill: '#f4ead6', light: '#ffffff', shade: '#cdb593', line: PALETTE.ink },
  black: { fill: '#3a4466', light: '#7d8fb0', shade: '#262b44', line: '#0b0a12' },
};

function pieceSvg(mask: Mask, color: 'white' | 'black'): string {
  const c = PIECE_COLORS[color];
  const at = (x: number, y: number) => x >= 0 && x < N && y >= 0 && y < N && mask[y][x];
  const px: string[] = [];
  const rect1 = (x: number, y: number, fill: string) => px.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (at(x, y)) {
        const lit = !at(x - 1, y) || !at(x, y - 1);
        const dark = !at(x + 1, y) || !at(x, y + 1) || !at(x + 2, y);
        rect1(x, y, lit ? c.light : dark ? c.shade : c.fill);
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) rect1(x, y, c.line);
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges">${px.join('')}</svg>`;
}

const svgUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

/** CSS for chessground: the pixel pieces and a two-tone board. */
export function boardCss(light = PALETTE.tan, dark = PALETTE.clay): string {
  const rules: string[] = [];
  for (const role of Object.keys(SHAPES))
    for (const color of ['white', 'black'] as const) rules.push(`.cg-wrap piece.${role}.${color}{background-image:${svgUrl(pieceSvg(SHAPES[role], color))}}`);
  const squares: string[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) squares.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${dark}"/>`);
  const board = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="${light}"/>${squares.join('')}</svg>`;
  rules.push(`cg-board{background-image:${svgUrl(board)};background-size:cover}`);
  return rules.join('\n');
}

export function pieceDataUrl(role: string, color: 'white' | 'black'): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(pieceSvg(SHAPES[role], color))}`;
}

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
