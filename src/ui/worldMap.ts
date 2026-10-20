// The world map, drawn in code: one tall pixel-art picture with the seven regions stacked from the training field
// at the bottom to the Necromancer's throne at the top, a winding path through every rank, and each region's own
// ground, path and scenery (hay and fences, shacks and puddles, cottages and fields, a moat and towers, pines and
// mushrooms, lava and bones, pillars and a red carpet). The page puts buttons for the ranks on top of it.
import { CHARACTERS, WORLDS, type WorldId } from '../data/characters';
import { Canvas, any, ellipse, pixelsToUrl, polygon, rect, tone, type Shape } from './pixel';

export const MAP_W = 96;
const RANK_H = 46;
const PAD = 16;

export interface MapNode {
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
  nodes: MapNode[];
  regions: MapRegion[];
}

export function mapLayout(): MapLayout {
  const ranks = [...new Set(CHARACTERS.map((c) => c.rating))].sort((a, b) => a - b);
  const worldOfRank = (r: number) => CHARACTERS.find((c) => c.rating === r)!.world;
  const order = WORLDS.map((w) => w.id); // bottom to top
  const counts = order.map((w) => ranks.filter((r) => worldOfRank(r) === w).length);
  const h = counts.reduce((a, n) => a + n * RANK_H + PAD, 0) + 8;
  const regions: MapRegion[] = [];
  const nodes: MapNode[] = [];
  let bottom = h - 4;
  let i = 0;
  order.forEach((world, wi) => {
    const top = bottom - counts[wi] * RANK_H - PAD;
    regions.push({ world, y0: top, y1: bottom });
    ranks
      .filter((r) => worldOfRank(r) === world)
      .forEach((rating, k) => {
        // Alternate sides, with a little wobble so the path never looks ruled.
        const x = i % 2 === 0 ? 30 + ((i * 7) % 5) : 66 - ((i * 5) % 6);
        nodes.push({ rating, world, x, y: bottom - PAD + 4 - (k + 0.5) * RANK_H });
        i++;
      });
    bottom = top;
  });
  // The bottom and top regions run to the edges of the picture.
  regions[0].y1 = h;
  regions[regions.length - 1].y0 = 0;
  // The throne sits in the middle of its hall.
  const last = nodes[nodes.length - 1];
  if (last.world === 'throne') last.x = MAP_W / 2;
  return { w: MAP_W, h, nodes, regions };
}

// ---------- the path ----------
/** A smooth curve through the nodes (Catmull-Rom), from the bottom edge up to the throne. */
export function pathPoints(l: MapLayout, step = 0.5): [number, number][] {
  const pts: [number, number][] = [[l.nodes[0].x - 4, l.h + 6], ...l.nodes.map((n) => [n.x, n.y] as [number, number])];
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
const fence: Deco = (cv, x, y) => {
  cv.part(any(rect(x - 6, y - 4, x + 6, y - 3), rect(x - 6, y - 2, x + 6, y - 1), rect(x - 5, y - 5, x - 4, y + 1), rect(x - 0.5, y - 5, x + 0.5, y + 1), rect(x + 4, y - 5, x + 5, y + 1)), '#b07a4b', { box: bb(x, y, 7, 6), rim: false });
};
const house =
  (roof: string, wall = '#f0dfbf'): Deco =>
  (cv, x, y) => {
    cv.part(rect(x - 5, y - 6, x + 5, y + 1), wall, { box: bb(x, y, 6, 7) });
    cv.part(polygon([[x - 7, y - 5], [x, y - 12], [x + 7, y - 5]]), roof, { box: bb(x, y, 8, 13) });
    cv.part(rect(x - 1.5, y - 3, x + 1.5, y + 1), '#7a4f2c', { box: bb(x, y, 2, 4), rim: false });
    cv.dot(x + 3, y - 4, '#8fc3e8');
    cv.dot(x - 4, y - 4, '#8fc3e8');
  };
const shack: Deco = (cv, x, y) => {
  cv.part(rect(x - 4, y - 5, x + 4, y + 1), '#8a6a4f', { box: bb(x, y, 5, 6), pattern: (px) => (px % 3 === 0 ? '#76583f' : null) });
  cv.part(polygon([[x - 5.5, y - 4], [x - 4, y - 8], [x + 5, y - 7], [x + 5.5, y - 4]]), '#6b7a8a', { box: bb(x, y, 6, 9) });
  cv.part(rect(x - 1, y - 3, x + 1.5, y + 1), '#3b2a20', { box: bb(x, y, 2, 4), rim: false, outline: false });
};
const crate: Deco = (cv, x, y) => cv.part(rect(x - 2.5, y - 4, x + 2.5, y + 1), '#a8743f', { box: bb(x, y, 3, 5), pattern: (px, py) => ((px - py) % 4 === 0 ? '#8a5a30' : null) });
const barrel: Deco = (cv, x, y) => cv.part(ellipse(x, y - 2.5, 2.4, 3.2), '#9a6a3f', { box: bb(x, y, 3, 6), pattern: (_px, py) => (py === Math.round(y - 4) || py === Math.round(y - 1) ? '#5d4a3a' : null) });
const puddle: Deco = (cv, x, y) => {
  cv.part(ellipse(x, y - 1.5, 5, 2.2), '#8fb0c8', { box: bb(x, y, 6, 4), rim: false });
  cv.dot(x - 2, y - 2, '#d8ecf6');
};
const field: Deco = (cv, x, y) => {
  cv.part(rect(x - 7, y - 6, x + 7, y + 1), '#a57a48', { box: bb(x, y, 8, 7), rim: false, pattern: (_px, py) => ((py - Math.round(y)) % 2 === 0 ? '#7fae4a' : null) });
};
const well: Deco = (cv, x, y) => {
  cv.part(ellipse(x, y - 1.5, 3.2, 2), '#b8b0a4', { box: bb(x, y, 4, 4) });
  cv.part(any(rect(x - 3, y - 7, x - 2, y - 1), rect(x + 2, y - 7, x + 3, y - 1)), '#7a4f2c', { box: bb(x, y, 4, 8), rim: false });
  cv.part(polygon([[x - 4.5, y - 6], [x, y - 9], [x + 4.5, y - 6]]), '#c4553f', { box: bb(x, y, 5, 10) });
};
const tower =
  (flag: string): Deco =>
  (cv, x, y) => {
    cv.part(any(rect(x - 4, y - 14, x + 4, y + 1), rect(x - 5, y - 17, x + 5, y - 14)), '#c9ccd4', { box: bb(x, y, 6, 18), pattern: (px, py) => ((px * 3 + py * 5) % 11 === 0 ? '#aeb2bc' : null) });
    cv.part(any(rect(x - 5, y - 19, x - 3, y - 17), rect(x - 1, y - 19, x + 1, y - 17), rect(x + 3, y - 19, x + 5, y - 17)), '#c9ccd4', { box: bb(x, y, 6, 20), rim: false });
    cv.part(rect(x - 1.2, y - 9, x + 1.2, y - 5), '#3b2a3a', { box: bb(x, y, 2, 10), rim: false, outline: false });
    for (let k = 0; k < 6; k++) cv.dot(x, y - 20 - k, '#5d4a3a');
    cv.part(polygon([[x + 0.5, y - 26], [x + 5, y - 24.5], [x + 0.5, y - 23]]), flag, { box: bb(x, y, 6, 27), rim: false });
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

const SCENERY: Record<WorldId, [Deco, number][]> = {
  training: [[scarecrow, 1], [hay, 3], [fence, 3], [flowers(['#ffffff', '#f2b33d', '#e86a8a']), 6], [tuft('#6ea84e'), 10], [bush('#6ea84e'), 2], [tree('#5e9b45'), 2]],
  gutter: [[shack, 4], [crate, 3], [barrel, 3], [puddle, 4], [rock('#6e665c'), 3], [tuft('#6b6a4a'), 6]],
  village: [[house('#c4553f'), 2], [house('#e0812f'), 1], [house('#4f7bb0'), 1], [field, 2], [well, 1], [tree('#5e9b45'), 4], [flowers(['#ffffff', '#f2b33d', '#e86a8a', '#7aa8e8']), 8], [tuft('#82b860'), 8]],
  castle: [[tower('#0099db'), 3], [tower('#e43b44'), 1], [hedge, 4], [tree('#4f8a3a'), 3], [flowers(['#ffffff', '#f2b33d']), 6], [tuft('#6ea84e'), 8], [rock('#a8a49c'), 2]],
  wilds: [[pine, 7], [tree('#3f7a3a'), 4], [mushroom, 5], [rock('#8a8f84'), 3], [pond, 1], [tuft('#4a8a3a'), 8], [bush('#4a8a3a'), 3]],
  underworld: [[lava, 4], [crystal, 3], [deadTree, 3], [bones, 4], [rock('#2a1c22'), 4]],
  throne: [[pillar, 4], [brazier, 4], [statue, 2]],
};

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
    cv.part(rect(bx - 5, y - 4.5, bx + 5, y + 4.5), '#a8743f', { box: [bx - 6, y - 6, bx + 6, y + 6], pattern: (_x, yy) => (yy % 2 === 0 ? '#8a5a30' : null) });
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
  for (const [w, key] of [[4.3, 'edge'], [3.2, 'path']] as const)
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
  // Scenery, away from the path, the rank stones and the region signs; sorted by y so nearer things overlap.
  const near = (x: number, y: number, d: number) => path.some(([px, py]) => Math.abs(px - x) < d && Math.abs(py - y) < d && Math.hypot(px - x, py - y) < d);
  const placed: { x: number; y: number; d: Deco }[] = [];
  for (const reg of l.regions) {
    for (const [deco, n] of SCENERY[reg.world])
      for (let k = 0; k < n * 3 && placed.filter((p) => p.d === deco && p.y >= reg.y0 && p.y < reg.y1).length < n; k++) {
        const x = 5 + Math.floor(r() * (l.w - 10));
        const y = Math.floor(reg.y0 + 12 + r() * (reg.y1 - reg.y0 - 14));
        if (near(x, y, 9) || l.nodes.some((nd) => Math.hypot(nd.x - x, nd.y - y) < 13)) continue;
        if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 7)) continue;
        if (y > reg.y1 - 10 && (x < 26 || x > l.w - 26)) continue; // keep the sign corners clear
        placed.push({ x, y, d: deco });
      }
  }
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
