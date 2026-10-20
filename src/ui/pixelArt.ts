// Pixel art made in code: the 16×16 chess pieces and the placeholder character portraits.
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
// Authored as fill masks ("x"); the outline, shading and highlight are added by code so every piece matches.
const SHAPES: Record<string, string[]> = {
  pawn: [
    '................',
    '................',
    '................',
    '......xxxx......',
    '.....xxxxxx.....',
    '.....xxxxxx.....',
    '......xxxx......',
    '.....xxxxxx.....',
    '......xxxx......',
    '......xxxx......',
    '.....xxxxxx.....',
    '....xxxxxxxx....',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '................',
    '................',
  ],
  rook: [
    '................',
    '................',
    '...xx.xxxx.xx...',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '....xxxxxxxx....',
    '.....xxxxxx.....',
    '.....xxxxxx.....',
    '.....xxxxxx.....',
    '.....xxxxxx.....',
    '....xxxxxxxx....',
    '...xxxxxxxxxx...',
    '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..',
    '................',
    '................',
  ],
  knight: [
    '................',
    '................',
    '.....xx.........',
    '.....xxxxx......',
    '....xxxxxxxx....',
    '...xxxxxxxxxx...',
    '..xxxx.xxxxxx...',
    '..xxxxxxxxxxx...',
    '...xxx.xxxxxx...',
    '.......xxxxxx...',
    '......xxxxxx....',
    '.....xxxxxxx....',
    '....xxxxxxxxx...',
    '...xxxxxxxxxxx..',
    '...xxxxxxxxxxx..',
    '................',
  ],
  bishop: [
    '................',
    '.......xx.......',
    '......xxxx......',
    '.....xxx.xx.....',
    '.....xx.xxx.....',
    '.....xxxxxx.....',
    '......xxxx......',
    '.....xxxxxx.....',
    '......xxxx......',
    '......xxxx......',
    '.....xxxxxx.....',
    '....xxxxxxxx....',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '................',
    '................',
  ],
  queen: [
    '................',
    '..x....xx....x..',
    '..xx..xxxx..xx..',
    '..xxx.xxxx.xxx..',
    '..xxxxxxxxxxxx..',
    '...xxxxxxxxxx...',
    '....xxxxxxxx....',
    '.....xxxxxx.....',
    '.....xxxxxx.....',
    '.....xxxxxx.....',
    '....xxxxxxxx....',
    '...xxxxxxxxxx...',
    '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..',
    '................',
    '................',
  ],
  king: [
    '.......xx.......',
    '......xxxx......',
    '.......xx.......',
    '....xxxxxxxx....',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '....xxxxxxxx....',
    '.....xxxxxx.....',
    '.....xxxxxx.....',
    '.....xxxxxx.....',
    '....xxxxxxxx....',
    '...xxxxxxxxxx...',
    '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..',
    '................',
    '................',
  ],
};

const PIECE_COLORS = {
  white: { fill: PALETTE.parchment, shade: PALETTE.sand, light: '#ffffff', line: PALETTE.ink },
  black: { fill: PALETTE.slate, shade: PALETTE.night, light: PALETTE.steel, line: PALETTE.ink },
};

function pieceSvg(shape: string[], color: 'white' | 'black'): string {
  const c = PIECE_COLORS[color];
  const at = (x: number, y: number) => y >= 0 && y < 16 && x >= 0 && x < 16 && shape[y][x] === 'x';
  const px: string[] = [];
  const rect = (x: number, y: number, fill: string) => px.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (at(x, y)) {
        const edgeLeft = !at(x - 1, y) || !at(x, y - 1);
        rect(x, y, y >= 11 ? c.shade : edgeLeft ? c.light : c.fill);
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) rect(x, y, c.line);
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${px.join('')}</svg>`;
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
