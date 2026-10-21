// The world map, drawn in code: one tall pixel-art picture with the seven regions stacked from the training field
// at the bottom to the Necromancer's throne at the top, a winding path through every rank, and each region's own
// ground, path and scenery (hay and fences, shacks and puddles, cottages and fields, a moat and towers, pines and
// mushrooms, lava and bones, pillars and a red carpet). The page puts buttons for the ranks on top of it.
import { CHARACTERS, WORLDS, type Character, type WorldId } from '../data/characters';
import { Canvas, any, ellipse, minus, pixelsToUrl, polygon, rect, tone, type Shape } from './pixel';

export const MAP_W = 144;
/** Path length per character, and extra room per region (for its sign). */
const STEP_H = 48;
const PAD = 27;

export interface MapNode {
  /** The character standing here. */
  id: string;
  rating: number;
  world: WorldId;
  x: number;
  y: number;
}
export interface MapRegion {
  world: WorldId;
  y0: number;
  y1: number;
}
export interface MapLayout {
  w: number;
  h: number;
  /** Bottom to top: region by region, and inside a region from the lowest rating up. */
  nodes: MapNode[];
  regions: MapRegion[];
}

export function mapLayout(roster: readonly Character[] = CHARACTERS): MapLayout {
  const order = WORLDS.map((w) => w.id); // bottom to top
  const inWorld = order.map((w) => roster.filter((c) => c.world === w).sort((a, b) => a.rating - b.rating));
  const h = inWorld.reduce((a, cs) => a + cs.length * STEP_H + PAD, 0) + 8;
  const regions: MapRegion[] = [];
  const nodes: MapNode[] = [];
  let bottom = h - 4;
  let i = 0;
  order.forEach((world, wi) => {
    const top = bottom - inWorld[wi].length * STEP_H - PAD;
    regions.push({ world, y0: top, y1: bottom });
    inWorld[wi].forEach((c, k) => {
      // Alternate sides, with a little wobble so the path never looks ruled.
      const x = inWorld[wi].length === 1 ? MAP_W / 2 : i % 2 === 0 ? 42 + ((i * 7) % 5) : 102 - ((i * 5) % 6);
      nodes.push({ id: c.id, rating: c.rating, world, x, y: bottom - PAD + 6 - (k + 0.5) * STEP_H });
      i++;
    });
    bottom = top;
  });
  // The bottom and top regions run to the edges of the picture.
  regions[0].y1 = h;
  regions[regions.length - 1].y0 = 0;
  return { w: MAP_W, h, nodes, regions };
}

/** Where the hero stands for a rating: halfway between the last character below it and the next one. Those
 * two stand on opposite sides of the path, so the middle is free; next to a lone figure, a step to the side. */
export function heroSpot(l: MapLayout, rating: number): { x: number; y: number } {
  const n = l.nodes;
  const next = n.findIndex((node) => node.rating > rating);
  const beside = (node: MapNode, dy: number) => ({ x: node.x + (node.x <= MAP_W / 2 ? 36 : -36), y: node.y + dy });
  if (next === 0) return beside(n[0], STEP_H * 0.4);
  if (next === -1) return beside(n[n.length - 1], 0);
  const [a, b] = [n[next - 1], n[next]];
  if (Math.abs(a.x - b.x) < 30) return beside(b, (a.y - b.y) / 2);
  return { x: MAP_W / 2, y: (a.y + b.y) / 2 };
}

// ---------- the path ----------
/** A smooth curve through the nodes (Catmull-Rom), from the bottom edge up to the throne. */
export function pathPoints(l: MapLayout, step = 0.5): [number, number][] {
  const pts: [number, number][] = [[l.nodes[0].x - 4, l.h + 6]];
  for (const n of l.nodes) {
    // Into the throne hall the carpet runs straight up the middle.
    if (n.world === 'throne') {
      const hall = l.regions.find((r) => r.world === 'throne')!;
      pts.push([MAP_W / 2, hall.y1 + 10], [MAP_W / 2, hall.y1 - 6]);
    }
    pts.push([n.x, n.y]);
  }
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

interface Style {
  ground: string[];
  path: string;
  edge: string;
}
const STYLE: Record<WorldId, Style> = {
  training: { ground: ['#8cc46a', '#96cc72', '#82ba60'], path: '#dcb57c', edge: '#a8804c' },
  gutter: { ground: ['#857b6c', '#8e8474', '#7a7062'], path: '#a99a82', edge: '#62574a' },
  village: { ground: ['#9fd07a', '#a8d884', '#94c670'], path: '#e0bd84', edge: '#ad8550' },
  castle: { ground: ['#88bf68', '#92c772', '#7fb560'], path: '#cfc8bc', edge: '#857d70' },
  wilds: { ground: ['#5e9b45', '#67a34d', '#558f3f'], path: '#b8935e', edge: '#7a5a34' },
  underworld: { ground: ['#4a3036', '#54383e', '#40292e'], path: '#8a6a62', edge: '#24161b' },
  throne: { ground: ['#c3aed2', '#cbb8d8', '#b9a3c9'], path: '#b03040', edge: '#f2b33d' },
};

function rng(seed: number) {
  return () => ((seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0) % 100000) / 100000;
}

// ---------- scenery ----------
type Deco = (cv: Canvas, x: number, y: number, r: () => number) => void;
const bb = (x: number, y: number, w: number, h: number): [number, number, number, number] => [x - w, y - h, x + w, y + 3];

const tree =
  (leaf: string, trunk = '#7a4f2c'): Deco =>
  (cv, x, y) => {
    cv.part(rect(x - 1, y - 4, x + 1, y + 1), trunk, { box: bb(x, y, 2, 5) });
    cv.part(any(ellipse(x, y - 8, 5, 4.6), ellipse(x - 3, y - 5.5, 3.2, 2.8), ellipse(x + 3, y - 5.5, 3.2, 2.8)), leaf, { box: bb(x, y, 7, 14) });
  };
const pine: Deco = (cv, x, y) => {
  cv.part(rect(x - 1, y - 3, x + 1, y + 1), '#6b4428', { box: bb(x, y, 2, 4) });
  cv.part(polygon([[x - 5, y - 2], [x, y - 15], [x + 5, y - 2]]), '#3f7a3a', { box: bb(x, y, 6, 16) });
};
const bush =
  (c: string): Deco =>
  (cv, x, y) =>
    cv.part(any(ellipse(x - 1.5, y - 1.5, 2.8, 2.4), ellipse(x + 1.6, y - 1.6, 2.6, 2.3)), c, { box: bb(x, y, 5, 5) });
const rock =
  (c: string): Deco =>
  (cv, x, y) =>
    cv.part(polygon([[x - 3, y], [x - 2, y - 3], [x + 1, y - 4], [x + 3, y - 1], [x + 3, y]]), c, { box: bb(x, y, 4, 5) });
const flowers =
  (cs: string[]): Deco =>
  (cv, x, y, r) => {
    for (let k = 0; k < 4; k++) cv.dot(Math.round(x + (r() - 0.5) * 6), Math.round(y - r() * 4), cs[Math.floor(r() * cs.length)]);
  };
const tuft =
  (c: string): Deco =>
  (cv, x, y) => {
    [[0, 0], [-1, -1], [1, -1], [0, -2]].forEach(([dx, dy]) => cv.dot(x + dx, y + dy, c));
  };
const hay: Deco = (cv, x, y) => {
  cv.part(ellipse(x, y - 3, 4.5, 3.6), '#e3c46a', { box: bb(x, y, 5, 7), pattern: (px, py) => ((px + py) % 3 === 0 ? '#c9a44a' : null) });
};
const crate: Deco = (cv, x, y) => cv.part(rect(x - 2.5, y - 4, x + 2.5, y + 1), '#a8743f', { box: bb(x, y, 3, 5), pattern: (px, py) => ((px - py) % 4 === 0 ? '#8a5a30' : null) });
const barrel: Deco = (cv, x, y) => cv.part(ellipse(x, y - 2.5, 2.4, 3.2), '#9a6a3f', { box: bb(x, y, 3, 6), pattern: (_px, py) => (py === Math.round(y - 4) || py === Math.round(y - 1) ? '#5d4a3a' : null) });
const puddle: Deco = (cv, x, y) => {
  cv.part(ellipse(x, y - 1.5, 5, 2.2), '#8fb0c8', { box: bb(x, y, 6, 4), rim: false });
  cv.dot(x - 2, y - 2, '#d8ecf6');
};
const well: Deco = (cv, x, y) => {
  cv.part(ellipse(x, y - 1.5, 3.2, 2), '#b8b0a4', { box: bb(x, y, 4, 4) });
  cv.part(any(rect(x - 3, y - 7, x - 2, y - 1), rect(x + 2, y - 7, x + 3, y - 1)), '#7a4f2c', { box: bb(x, y, 4, 8), rim: false });
  cv.part(polygon([[x - 4.5, y - 6], [x, y - 9], [x + 4.5, y - 6]]), '#c4553f', { box: bb(x, y, 5, 10) });
};
const hedge: Deco = (cv, x, y) => cv.part(rect(x - 5, y - 4, x + 5, y + 1), '#4f8a3a', { box: bb(x, y, 6, 5) });
const mushroom: Deco = (cv, x, y, r) => {
  const c = r() < 0.5 ? '#d0443a' : '#e3a33a';
  cv.part(rect(x - 0.8, y - 2.5, x + 0.8, y + 1), '#f4ead6', { box: bb(x, y, 2, 3), rim: false });
  cv.part(polygon([[x - 3, y - 2], [x - 2, y - 4.5], [x + 2, y - 4.5], [x + 3, y - 2]]), c, { box: bb(x, y, 4, 5) });
  cv.dot(x - 1, y - 4, '#ffffff');
};
const pond: Deco = (cv, x, y) => {
  cv.part(ellipse(x, y - 2, 7, 3), '#5aa8d8', { box: bb(x, y, 8, 5) });
  cv.dot(x - 3, y - 3, '#bfe6f5');
  cv.dot(x + 2, y - 2, '#bfe6f5');
};
const lava: Deco = (cv, x, y) => {
  cv.part(ellipse(x, y - 2, 5.5, 2.6), '#f07a2a', { box: bb(x, y, 6, 5) });
  cv.part(ellipse(x - 1, y - 2.4, 2.4, 1.1), '#ffd04a', { box: bb(x, y, 4, 4), outline: false, rim: false });
};
const crystal: Deco = (cv, x, y) => cv.part(any(polygon([[x - 3, y], [x - 2, y - 6], [x - 0.5, y]]), polygon([[x - 1, y], [x + 1, y - 9], [x + 2.5, y]]), polygon([[x + 1.5, y], [x + 3.5, y - 5], [x + 4, y]])), '#d05a7a', { box: bb(x, y, 5, 10) });
const deadTree: Deco = (cv, x, y) => {
  cv.part(any(rect(x - 1, y - 9, x + 1, y + 1), polygon([[x, y - 7], [x - 5, y - 11], [x - 4, y - 12], [x, y - 8.5]]), polygon([[x, y - 5], [x + 5, y - 9], [x + 5.5, y - 8], [x + 0.5, y - 3.5]])), '#3a2a2e', { box: bb(x, y, 6, 13) });
};
const bones: Deco = (cv, x, y) => {
  cv.part(ellipse(x, y - 2, 2.2, 2), '#ece4cf', { box: bb(x, y, 3, 4) });
  cv.dot(x - 1, y - 2, '#24161b');
  cv.dot(x + 1, y - 2, '#24161b');
};
const pillar: Deco = (cv, x, y) => {
  cv.part(any(rect(x - 2.5, y - 14, x + 2.5, y + 1), rect(x - 3.5, y - 16, x + 3.5, y - 14), rect(x - 3.5, y - 1, x + 3.5, y + 1)), '#efe6f2', { box: bb(x, y, 4, 17), pattern: (px) => ((px - Math.round(x)) % 2 === 0 ? '#ddd0e4' : null) });
};
const brazier: Deco = (cv, x, y) => {
  cv.part(polygon([[x - 3, y - 4], [x + 3, y - 4], [x + 1.5, y - 1], [x + 1.5, y + 1], [x - 1.5, y + 1], [x - 1.5, y - 1]]), '#c9a04a', { box: bb(x, y, 4, 5) });
  cv.part(polygon([[x - 2, y - 4], [x - 1, y - 7], [x, y - 9], [x + 1, y - 7], [x + 2, y - 4]]), '#f07a2a', { box: bb(x, y, 3, 10), rim: false });
};
const statue: Deco = (cv, x, y) => {
  cv.part(rect(x - 3, y - 3, x + 3, y + 1), '#9a8aa8', { box: bb(x, y, 4, 4) });
  cv.part(any(ellipse(x, y - 9.5, 2, 2), rect(x - 2, y - 7.5, x + 2, y - 3)), '#b8aac4', { box: bb(x, y, 3, 12) });
};
const scarecrow: Deco = (cv, x, y) => {
  cv.part(rect(x - 0.6, y - 9, x + 0.6, y + 1), '#7a4f2c', { box: bb(x, y, 1, 10), rim: false });
  cv.part(rect(x - 4, y - 7, x + 4, y - 6), '#7a4f2c', { box: bb(x, y, 5, 8), rim: false });
  cv.part(ellipse(x, y - 9.5, 2, 2), '#d8b77a', { box: bb(x, y, 3, 12) });
  cv.part(ellipse(x, y - 11, 3.4, 1), '#e3c46a', { box: bb(x, y, 4, 13), rim: false });
};

// ---- built things, a little larger and more detailed ----
const STONE = '#c9ccd4';
/** A round tower with a conical roof and a pennant. */
const roundTower =
  (roof: string, flag: string): Deco =>
  (cv, x, y) => {
    cv.part(any(rect(x - 5, y - 18, x + 5, y + 1), ellipse(x, y + 0.5, 5, 1.5)), STONE, { box: bb(x, y, 7, 20), pattern: (px, py) => ((Math.floor(py / 3) + (px % 4 === 0 ? 1 : 0)) % 2 === 0 && px % 4 === 0 ? '#aeb2bc' : null) });
    cv.part(rect(x - 1, y - 12, x + 1, y - 8), '#3b2a3a', { box: bb(x, y, 2, 13), rim: false, outline: false });
    cv.part(polygon([[x - 7, y - 17], [x, y - 29], [x + 7, y - 17]]), roof, { box: bb(x, y, 8, 30), pattern: (px, py) => ((px + py) % 4 === 0 ? tone(roof, -0.15) : null) });
    for (let k = 0; k < 4; k++) cv.dot(x, y - 30 - k, '#5d4a3a');
    cv.part(polygon([[x + 0.5, y - 34], [x + 5, y - 32.5], [x + 0.5, y - 31]]), flag, { box: bb(x, y, 6, 35), rim: false });
  };
/** The keep: a big square tower with battlements and two windows. */
const keep: Deco = (cv, x, y) => {
  cv.part(rect(x - 9, y - 26, x + 9, y + 1), STONE, { box: bb(x, y, 10, 27), pattern: (px, py) => (py % 4 === 0 || (px + (Math.floor(py / 4) % 2) * 3) % 6 === 0 ? '#b6bac4' : null) });
  for (let k = -9; k < 9; k += 4) cv.part(rect(x + k, y - 29, x + k + 2.5, y - 26), STONE, { box: bb(x, y, 10, 30), rim: false });
  for (const wx of [-4, 3]) cv.part(rect(x + wx, y - 20, x + wx + 2, y - 15), '#3b2a3a', { box: bb(x, y, 10, 21), rim: false, outline: false });
  cv.part(rect(x - 2.5, y - 6, x + 2.5, y + 1), '#5d4a3a', { box: bb(x, y, 3, 7), rim: false });
  cv.part(polygon([[x + 0.5, y - 38], [x + 7, y - 36], [x + 0.5, y - 34]]), '#e43b44', { box: bb(x, y, 8, 39), rim: false });
  for (let k = 0; k < 9; k++) cv.dot(x, y - 29 - k, '#5d4a3a');
};
/** A timber-framed townhouse (as in the Gutter backdrop). */
const townhouse =
  (roof: string): Deco =>
  (cv, x, y, r) => {
    cv.part(rect(x - 6, y - 7, x + 6, y + 1), '#6e6474', { box: bb(x, y, 7, 8) });
    cv.part(rect(x - 7, y - 15, x + 7, y - 7), '#a8987e', { box: bb(x, y, 8, 16), pattern: (px, py) => ((px - x + 7) % 5 === 0 || py === Math.round(y - 11) ? '#5a4030' : null) });
    cv.part(polygon([[x - 8.5, y - 14], [x + Math.round(r() * 2 - 1), y - 24], [x + 8.5, y - 14]]), roof, { box: bb(x, y, 9, 25), pattern: (px, py) => ((px + py) % 3 === 0 ? tone(roof, -0.15) : null) });
    cv.part(rect(x - 1.5, y - 5, x + 1.5, y + 1), '#2a2030', { box: bb(x, y, 2, 6), rim: false, outline: false });
    if (r() < 0.5) cv.dot(x + 4, y - 11, '#f2c45a');
  };
/** A cottage with a thatched or tiled roof and a chimney. */
const cottage =
  (roof: string, wall = '#f0dfbf'): Deco =>
  (cv, x, y) => {
    cv.part(rect(x - 7, y - 8, x + 7, y + 1), wall, { box: bb(x, y, 8, 9) });
    cv.part(rect(x + 3, y - 18, x + 5, y - 12), '#8a6a5a', { box: bb(x, y, 6, 19), rim: false });
    cv.part(polygon([[x - 9, y - 7], [x, y - 16], [x + 9, y - 7]]), roof, { box: bb(x, y, 10, 17), pattern: (px, py) => ((py + Math.round(y)) % 2 === 0 && px % 3 === 0 ? tone(roof, -0.18) : null) });
    cv.part(rect(x - 1.5, y - 5, x + 1.5, y + 1), '#7a4f2c', { box: bb(x, y, 2, 6), rim: false });
    for (const wx of [-5, 3]) cv.part(rect(x + wx, y - 6, x + wx + 2, y - 3), '#8fc3e8', { box: bb(x, y, 8, 7), rim: false });
  };
const barn: Deco = (cv, x, y) => {
  cv.part(rect(x - 10, y - 11, x + 10, y + 1), '#b2563d', { box: bb(x, y, 11, 12), pattern: (px) => (px % 3 === 0 ? '#9a4a34' : null) });
  cv.part(polygon([[x - 12, y - 10], [x - 6, y - 19], [x + 6, y - 19], [x + 12, y - 10]]), '#6b4a3a', { box: bb(x, y, 13, 20) });
  cv.part(rect(x - 3.5, y - 8, x + 3.5, y + 1), '#f4ead6', { box: bb(x, y, 4, 9), rim: false, pattern: (px, py) => (px - Math.round(x) === py - Math.round(y) + 4 || px - Math.round(x) === -(py - Math.round(y) + 4) ? '#b2563d' : null) });
};
const throneSeat: Deco = (cv, x, y) => {
  cv.part(polygon([[x - 9, y], [x - 9, y - 26], [x - 5, y - 32], [x, y - 28], [x + 5, y - 32], [x + 9, y - 26], [x + 9, y]]), '#f2b33d', { box: bb(x, y, 10, 33) });
  cv.part(rect(x - 6, y - 24, x + 6, y - 6), '#6b2a7a', { box: bb(x, y, 7, 25), rim: false });
  cv.part(rect(x - 12, y - 1, x + 12, y + 3), '#8a6a9a', { box: [x - 13, y - 2, x + 13, y + 4], rim: false }); // the dais
};
const banner =
  (c: string): Deco =>
  (cv, x, y) => {
    cv.part(rect(x - 3, y - 14, x + 3, y), c, { box: bb(x, y, 4, 15) });
    cv.part(polygon([[x - 3, y - 1], [x, y + 3], [x + 3, y - 1]]), c, { box: [x - 4, y - 2, x + 4, y + 4], rim: false });
    cv.part(ellipse(x, y - 8, 1.4, 1.4), '#f2b33d', { box: bb(x, y, 2, 10), outline: false, rim: false });
  };

interface Placed {
  x: number;
  y: number;
  d: Deco;
}

/** The built things and scenery of one region. */
function planRegion(cv: Canvas, l: MapLayout, reg: MapRegion, path: [number, number][], r: () => number, placed: Placed[]) {
  const W = l.w;
  const nodes = l.nodes.filter((n) => n.world === reg.world);
  const top = Math.max(0, reg.y0);
  const bottom = Math.min(l.h, reg.y1);
  const nearPath = (x: number, y: number, d: number) => path.some(([px, py]) => Math.abs(py - y) < d && Math.hypot(px - x, py - y) < d);
  // A figure with its name tag stands roughly here (map pixels).
  const nearFigure = (x: number, y: number, pad = 0) => l.nodes.some((n) => Math.abs(n.x - x) < 20 + pad && y > n.y - 30 - pad && y < n.y + 14 + pad);
  const inSign = (x: number, y: number) => y > reg.y1 - 16 && (x < 46 || x > W - 46);
  const free = (x: number, y: number, d = 9) => y > top + 6 && y < bottom - 4 && !nearPath(x, y, d) && !nearFigure(x, y) && !inSign(x, y) && !placed.some((p) => Math.hypot(p.x - x, p.y - y) < 8);
  const put = (x: number, y: number, d: Deco, room = 9) => {
    if (free(x, y, room)) placed.push({ x: Math.round(x), y: Math.round(y), d });
  };
  const scatter = (d: Deco, n: number, xs: [number, number] = [6, W - 6], room = 9) => {
    for (let k = 0; k < n * 6 && n > 0; k++) {
      const before = placed.length;
      put(xs[0] + r() * (xs[1] - xs[0]), top + 8 + r() * (bottom - top - 12), d, room);
      if (placed.length > before) n--;
    }
  };
  /** The path's x at a height (for gates and bridges). */
  const pathX = (y: number) => path.reduce((best, p) => (Math.abs(p[1] - y) < Math.abs(best[1] - y) ? p : best), path[0])[0];
  const fenceRow = (x0: number, x1: number, y: number) => {
    for (let x = x0; x <= x1; x += 4) cv.part(rect(x - 0.5, y - 4, x + 0.5, y + 1), '#8a5a30', { box: [x - 2, y - 5, x + 2, y + 2], rim: false });
    cv.part(any(rect(x0, y - 3.5, x1 + 1, y - 2.5), rect(x0, y - 1.5, x1 + 1, y - 0.5)), '#b07a4b', { box: [x0 - 1, y - 5, x1 + 2, y + 1], rim: false, outline: false });
  };
  const flowersOf = flowers(['#ffffff', '#f2b33d', '#e86a8a', '#7aa8e8']);

  switch (reg.world) {
    case 'training': {
      // A fenced practice field with straw dummies and hay on the left, the barn on the right.
      const y0 = top + 14;
      const y1 = bottom - 20;
      fenceRow(8, 50, y0);
      fenceRow(8, 50, y1);
      for (let y = y0; y <= y1; y += 4) for (const x of [8, 50]) cv.part(rect(x - 0.5, y - 4, x + 0.5, y + 1), '#8a5a30', { box: [x - 2, y - 5, x + 2, y + 2], rim: false });
      placed.push({ x: 20, y: Math.round(y0 + 16), d: scarecrow }, { x: 38, y: Math.round(y0 + 30), d: scarecrow }, { x: 18, y: Math.round(y1 - 4), d: hay }, { x: 30, y: Math.round(y1 - 6), d: hay }, { x: 42, y: Math.round(y1 - 3), d: hay });
      put(120, top + 30, barn, 14);
      scatter(tree('#5e9b45'), 3, [104, W - 6]);
      scatter(bush('#6ea84e'), 3);
      scatter(flowersOf, 8);
      scatter(tuft('#6ea84e'), 10);
      break;
    }
    case 'gutter': {
      // Two rows of crooked townhouses along the street, crates and barrels by their doors.
      const roofs = ['#4b4660', '#5a4a3a', '#3b4a5a', '#4a3a4e'];
      for (const side of [0, 1]) {
        let y = top + 26 + side * 14;
        while (y < bottom - 6) {
          const x = side ? W - 14 - r() * 4 : 14 + r() * 4;
          if (r() < 0.82) put(x, y, townhouse(roofs[Math.floor(r() * roofs.length)]), 6);
          else put(x, y, r() < 0.5 ? barrel : crate, 6); // an alley with junk
          if (r() < 0.45) put(side ? x - 15 : x + 15, y + 2, r() < 0.5 ? crate : barrel, 5);
          y += 30 + r() * 12;
        }
      }
      scatter(puddle, 6, [24, W - 24], 6);
      scatter(tuft('#6b6a4a'), 8);
      break;
    }
    case 'village': {
      // Patchwork fields with hedgerows at both edges; cottages near the road; an orchard; the well.
      for (const side of [0, 1]) {
        let y = top + 10 + side * 16;
        while (y < bottom - 22) {
          const h = 16 + Math.floor(r() * 14);
          const w = 20 + Math.floor(r() * 10);
          const [x0, x1] = side ? [W - 4 - w, W - 4] : [4, 4 + w];
          if (r() < 0.25) {
            // An orchard instead of a field.
            for (let ty = y + 8; ty < y + h; ty += 9) for (let tx = x0 + 5; tx < x1 - 2; tx += 9) placed.push({ x: tx, y: ty, d: tree(r() < 0.5 ? '#5e9b45' : '#6aa84e') });
          } else {
            const crop = ['#7fae4a', '#d8b74a', '#a57a48', '#c9a44a'][Math.floor(r() * 4)];
            const vertical = r() < 0.4;
            cv.part(rect(x0, y, x1, y + h), '#a57a48', { box: [x0 - 1, y - 1, x1 + 1, y + h + 1], rim: false, pattern: (px, py) => ((vertical ? px - x0 : py - y) % 3 === 0 ? crop : null) });
            cv.part(minus(rect(x0 - 1, y - 1, x1 + 1, y + h + 1), rect(x0, y, x1, y + h)), '#4f8a3a', { box: [x0 - 2, y - 2, x1 + 2, y + h + 2], rim: false, outline: false });
          }
          y += h + 8 + Math.floor(r() * 12);
        }
      }
      const roofs = ['#c4553f', '#e0812f', '#4f7bb0', '#c4553f'];
      let k = 0;
      for (let y = top + 34; y < bottom - 10; y += 30) put(k % 2 ? W - 46 : 46, y, cottage(roofs[k++ % roofs.length]), 10);
      scatter(well, 1, [56, W - 56], 8);
      scatter(tree('#5e9b45'), 6, [36, W - 36]);
      scatter(flowersOf, 10, [34, W - 34]);
      break;
    }
    case 'castle': {
      // A curtain wall with round towers at the corners and on the sides, gates where the road runs through,
      // the keep inside, and a formal garden.
      const wy0 = top + 28; // below the sign of the region above
      const wy1 = bottom - 10;
      const gateBottom = pathX(wy1);
      const gateTop = pathX(wy0);
      const wall = (shape: Shape, box: [number, number, number, number]) =>
        cv.part(shape, STONE, { box, pattern: (px, py) => (py % 3 === 0 || (px + (Math.floor(py / 3) % 2) * 2) % 5 === 0 ? '#b6bac4' : null) });
      wall(minus(rect(4, wy1 - 5, W - 4, wy1), rect(gateBottom - 9, wy1 - 6, gateBottom + 9, wy1 + 1)), [3, wy1 - 6, W - 3, wy1 + 1]);
      wall(minus(rect(4, wy0 - 5, W - 4, wy0), rect(gateTop - 9, wy0 - 6, gateTop + 9, wy0 + 1)), [3, wy0 - 6, W - 3, wy0 + 1]);
      wall(any(rect(4, wy0 - 5, 9, wy1), rect(W - 9, wy0 - 5, W - 4, wy1)), [3, wy0 - 6, W - 3, wy1 + 1]);
      for (let x = 4; x < W - 4; x += 4) for (const wy of [wy0, wy1]) if (Math.abs(x - (wy === wy0 ? gateTop : gateBottom)) > 10) cv.part(rect(x, wy - 7, x + 2, wy - 5), STONE, { box: [x - 1, wy - 8, x + 3, wy - 4], rim: false });
      const flags = ['#0099db', '#e43b44', '#63c74d', '#f2b33d'];
      // Towers stand where no figure does (a figure at the gate keeps it open).
      const tower = (x: number, y: number, flag: string) => {
        if (!nearFigure(x, y, 6)) placed.push({ x: Math.round(x), y: Math.round(y), d: roundTower('#5c6475', flag) });
      };
      [[7, wy0], [W - 7, wy0], [7, wy1], [W - 7, wy1], [7, (wy0 + wy1) / 2], [W - 7, (wy0 + wy1) / 2]].forEach(([x, y], i) => tower(x, y, flags[i % 4]));
      for (const [gx, gy] of [[gateBottom, wy1], [gateTop, wy0]]) for (const s of [-12, 12]) tower(gx + s, gy, '#0099db');
      // The keep in the largest free spot near the top; hedges and flower beds in pairs.
      for (const kx of [W - 30, 30]) {
        const before = placed.length;
        put(kx, wy0 + 40, keep, 16);
        if (placed.length > before) break;
      }
      // Two little formal gardens: a square of hedges with a fountain.
      for (const [gx, gy] of [[24, (wy0 + wy1) / 2 + 20], [W - 24, wy0 + 70]]) {
        for (const [dx, dy] of [[-7, -6], [7, -6], [-7, 8], [7, 8]]) put(gx + dx, gy + dy, hedge, 4);
        put(gx, gy + 1, pond, 4);
      }
      scatter(tree('#4f8a3a'), 4, [16, W - 16], 8);
      scatter(flowers(['#ffffff', '#f2b33d', '#e86a8a']), 10, [12, W - 12], 6);
      break;
    }
    case 'wilds': {
      // Deep forest at both edges with a clearing for the road; a pond, mushrooms and rocks.
      for (let y = top + 18; y < bottom - 4; y += 9)
        for (const x0 of [6, 16, W - 16, W - 6]) {
          const x = x0 + (r() - 0.5) * 6;
          if (free(x, y + (r() - 0.5) * 4, 6)) placed.push({ x: Math.round(x), y: Math.round(y), d: r() < 0.8 ? pine : tree('#3f7a3a') });
        }
      scatter(pine, 8, [26, W - 26], 8);
      scatter(pond, 1, [30, W - 30], 12);
      scatter(mushroom, 8, [20, W - 20], 6);
      scatter(rock('#8a8f84'), 4);
      scatter(bush('#4a8a3a'), 4, [20, W - 20], 7);
      scatter(tuft('#4a8a3a'), 10);
      break;
    }
    case 'underworld': {
      // A lava river across the widest gap between two figures, with a stone bridge where the road crosses.
      let ry = (top + bottom) / 2;
      let gap = 0;
      for (let i = 1; i < nodes.length; i++) if (nodes[i - 1].y - nodes[i].y > gap) [gap, ry] = [nodes[i - 1].y - nodes[i].y, (nodes[i - 1].y + nodes[i].y) / 2 - 4];
      const bx = pathX(ry);
      const river: Shape = (x, y) => Math.abs(y - (ry + Math.sin(x / 9) * 3)) < 3.5 && Math.abs(x - bx) > 8;
      cv.part(river, '#f07a2a', { box: [0, ry - 8, W, ry + 8], pattern: (x, y) => ((x * 3 + y * 7) % 11 === 0 ? '#ffd04a' : null) });
      cv.part(rect(bx - 8, ry - 6, bx + 8, ry + 6), '#5a4a50', { box: [bx - 9, ry - 7, bx + 9, ry + 7], pattern: (_x, y) => (Math.round(y) % 3 === 0 ? '#4a3a40' : null) });
      scatter(lava, 3, [10, W - 10], 10);
      for (const xs of [[6, 30], [W - 30, W - 6]] as [number, number][]) {
        scatter(crystal, 3, xs, 6);
        scatter(deadTree, 2, xs, 8);
      }
      scatter(bones, 6, [20, W - 20], 6);
      scatter(rock('#2a1c22'), 6);
      break;
    }
    case 'throne': {
      // A hall: walls with banners at the top, two rows of pillars, braziers, and the throne on its dais.
      cv.part(rect(0, top, W, top + 12), '#5c3f66', { box: [0, top - 1, W, top + 13], rim: false, pattern: (x) => (x % 12 < 2 ? '#4a3256' : null) });
      for (const x of [20, 52, 92, 124]) placed.push({ x, y: Math.round(top + 18), d: banner('#7b2a3e') });
      const king = nodes[0];
      if (king) placed.push({ x: Math.round(king.x), y: Math.round(king.y - 4), d: throneSeat });
      for (let y = top + 36; y < bottom - 4; y += 18) for (const x of [30, W - 30]) placed.push({ x, y: Math.round(y), d: pillar });
      for (let y = top + 44; y < bottom - 6; y += 36) for (const x of [50, W - 50]) put(x, y, brazier, 4);
      for (const x of [56, W - 56]) put(x, bottom - 8, statue, 4);
      break;
    }
  }
}


/** A wavy seam where one region meets the next, with a moat and a bridge in front of the castle. */
function drawSeam(cv: Canvas, below: WorldId, above: WorldId, y: number, path: [number, number][]) {
  const xAt = (yy: number) => {
    let best = path[0];
    for (const p of path) if (Math.abs(p[1] - yy) < Math.abs(best[1] - yy)) best = p;
    return best[0];
  };
  if (above === 'castle') {
    const water: Shape = (x, yy) => Math.abs(yy - (y + Math.sin(x / 6) * 1.2)) < 3;
    cv.part(water, '#4f8fc8', { box: [0, y - 5, MAP_W, y + 5], pattern: (x, yy) => ((x + yy * 3) % 9 === 0 ? '#9fd0f0' : null) });
    const bx = xAt(y);
    cv.part(rect(bx - 8, y - 5, bx + 8, y + 5), '#a8743f', { box: [bx - 9, y - 6, bx + 9, y + 6], pattern: (_x, yy) => (yy % 2 === 0 ? '#8a5a30' : null) });
    return;
  }
  const c = above === 'underworld' ? '#2a1c22' : above === 'throne' ? '#8a6a9a' : tone(STYLE[above].ground[0], -0.25);
  for (let x = 0; x < MAP_W; x++) {
    const yy = Math.round(y + Math.sin(x / 5 + below.length) * 1.5);
    cv.set(x, yy, c);
    if (above === 'underworld') cv.set(x, yy + 1, '#3a262c');
  }
}

/** The map's pixels (colour strings, row by row). */
export function renderMap(l: MapLayout): (string | null)[] {
  const cv = new Canvas(l.w, l.h);
  const r = rng(7);
  // Ground: each region's colours, speckled; the throne hall in tiles.
  for (const reg of l.regions) {
    const g = STYLE[reg.world].ground;
    for (let y = Math.max(0, Math.floor(reg.y0)); y < Math.min(l.h, Math.ceil(reg.y1)); y++)
      for (let x = 0; x < l.w; x++) {
        let c = g[0];
        const n = r();
        if (n < 0.12) c = g[1];
        else if (n < 0.22) c = g[2];
        if (reg.world === 'throne' && (x % 12 === 0 || (y - Math.floor(reg.y0)) % 12 === 0)) c = tone(g[0], -0.12);
        if (reg.world === 'gutter' && (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0 && y % 4 === 0) c = tone(g[0], -0.15);
        if (reg.world === 'underworld' && n > 0.995) c = '#f07a2a';
        cv.set(x, y, c);
      }
  }
  const path = pathPoints(l);
  // The path: an edge, then the surface, then a little texture.
  const regionAt = (y: number) => l.regions.find((g) => y >= g.y0 && y < g.y1) ?? l.regions[0];
  for (const [w, key] of [[5.6, 'edge'], [4.2, 'path']] as const)
    for (const [px, py] of path) {
      const st = STYLE[regionAt(py).world];
      for (let y = Math.floor(py - w); y <= Math.ceil(py + w); y++)
        for (let x = Math.floor(px - w); x <= Math.ceil(px + w); x++) if (Math.hypot(x + 0.5 - px, y + 0.5 - py) <= w) cv.set(x, y, st[key]);
    }
  for (const [px, py] of path)
    if (r() < 0.08) {
      const st = STYLE[regionAt(py).world];
      cv.set(Math.round(px + (r() - 0.5) * 4), Math.round(py + (r() - 0.5) * 4), regionAt(py).world === 'throne' ? '#8a2030' : tone(st.path, -0.12));
    }
  // Seams between regions (drawn over the path so the moat really crosses it, with its bridge).
  for (let i = 0; i < l.regions.length - 1; i++) drawSeam(cv, l.regions[i].world, l.regions[i + 1].world, l.regions[i].y0, path);
  // Region by region: first the built things (walls, fields, a lava river, the hall), then the scenery around
  // them, kept off the path, the figures and the region signs; sorted by y so nearer things overlap.
  const placed: Placed[] = [];
  for (const reg of l.regions) planRegion(cv, l, reg, path, r, placed);
  placed.sort((a, b) => a.y - b.y).forEach((p) => p.d(cv, p.x, p.y, r));
  return cv.px;
}

let cached: string | null = null;
/** The map as a PNG data URL (browser only), drawn once. */
export function mapUrl(l: MapLayout): string {
  if (cached) return cached;
  const url = pixelsToUrl(renderMap(l), l.w, l.h);
  if (url) cached = url;
  return url;
}
