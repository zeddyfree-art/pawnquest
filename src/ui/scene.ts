// The scene behind the board in a fight: a small pixel-art backdrop per region (drawn in code), and a few
// ambient particles on top of it: falling leaves on the training field, rain in the Gutter, pollen in the Village,
// dust in the Castle, fireflies in the Wilds, embers in the Underworld, sparkles in the Throne hall.
import type { WorldId } from '../data/characters';

/** The colour above the backdrop (the top of its sky), per region. */
export const SKY_TOP: Record<WorldId, string> = {
  training: '#9fd8ef',
  gutter: '#5b5778',
  village: '#8fd0f0',
  castle: '#7ec4ea',
  wilds: '#87c9e3',
  underworld: '#1e1020',
  throne: '#3e2a4f',
};

export const BACKDROP_W = 128;
export const BACKDROP_H = 160;

type Px = (x: number, y: number, c: string) => void;

function rng(seed: number) {
  return () => ((seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0) % 100000) / 100000;
}

/** Vertical bands of colour from top to bottom (pixel-art sky). */
function sky(px: Px, stops: string[], h = BACKDROP_H) {
  for (let y = 0; y < h; y++) {
    const c = stops[Math.min(stops.length - 1, Math.floor((y / h) * stops.length))];
    for (let x = 0; x < BACKDROP_W; x++) px(x, y, c);
  }
}
/** A silhouette line: everything below `height(x)` gets `c`. */
function ridge(px: Px, height: (x: number) => number, c: string, bottom = BACKDROP_H) {
  for (let x = 0; x < BACKDROP_W; x++) for (let y = Math.max(0, Math.round(height(x))); y < bottom; y++) px(x, y, c);
}
function box(px: Px, x0: number, y0: number, w: number, h: number, c: string) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && x < BACKDROP_W && y >= 0 && y < BACKDROP_H) px(x, y, c);
}
function tri(px: Px, cx: number, top: number, halfW: number, h: number, c: string) {
  for (let y = 0; y < h; y++) {
    const w = Math.round((halfW * y) / h);
    box(px, cx - w, top + y, 2 * w + 1, 1, c);
  }
}

const DRAW: Record<WorldId, (px: Px, r: () => number) => void> = {
  training: (px, r) => {
    sky(px, ['#9fd8ef', '#b4e2f2', '#c9ebf4', '#dcf2f1']);
    ridge(px, (x) => 92 + Math.sin(x / 14) * 4, '#a9cf7c');
    ridge(px, (x) => 104 + Math.sin(x / 9 + 2) * 3, '#8cbf5f');
    for (let x = 4; x < BACKDROP_W; x += 10) box(px, x, 112, 2, 10, '#9a6a3f'); // fence posts
    box(px, 0, 115, BACKDROP_W, 2, '#b07a4b');
    tri(px, 100, 92, 12, 18, '#e8c25a'); // haystack
    box(px, 88, 110, 25, 4, '#d4a944');
    ridge(px, () => 124, '#7cb45a');
    for (let k = 0; k < 40; k++) px(Math.floor(r() * BACKDROP_W), 124 + Math.floor(r() * 36), '#6aa24c');
  },
  gutter: (px, r) => {
    sky(px, ['#5b5778', '#6e6587', '#86729a', '#a07f9e', '#c08f8f']);
    let x = 0;
    while (x < BACKDROP_W) {
      const w = 14 + Math.floor(r() * 12);
      const h = 50 + Math.floor(r() * 40);
      box(px, x, BACKDROP_H - h, w, h, '#3f3a52');
      tri(px, x + Math.floor(w / 2), BACKDROP_H - h - 8, Math.floor(w / 2), 8, '#353046');
      if (r() < 0.6) box(px, x + 2, BACKDROP_H - h - 14, 3, 8, '#353046'); // chimney
      for (let wy = BACKDROP_H - h + 6; wy < BACKDROP_H - 14; wy += 10) for (let wx = x + 3; wx < x + w - 3; wx += 6) if (r() < 0.35) box(px, wx, wy, 2, 3, '#f2c45a');
      x += w + 1;
    }
    ridge(px, () => 148, '#2c2838');
  },
  village: (px, r) => {
    sky(px, ['#8fd0f0', '#a6dbf3', '#bfe6f5', '#d6f0f4']);
    ridge(px, (x) => 86 + Math.sin(x / 18) * 6, '#a9cf7c');
    // Windmill.
    box(px, 20, 66, 8, 24, '#e9dcc4');
    tri(px, 24, 58, 6, 8, '#b2563d');
    for (let i = -10; i <= 10; i++) {
      px(24 + i, 62 + i, '#8a6a4f');
      px(24 + i, 62 - i, '#8a6a4f');
    }
    // Cottages.
    for (const [cx, cy] of [[70, 84], [96, 90], [112, 80]]) {
      box(px, cx - 8, cy, 16, 12, '#f4e6c8');
      tri(px, cx, cy - 8, 10, 9, '#c4553f');
      box(px, cx - 2, cy + 5, 4, 7, '#7d4f2c');
    }
    ridge(px, (x) => 102 + Math.sin(x / 11 + 1) * 3, '#8cbf5f');
    ridge(px, () => 122, '#7cb45a');
    for (let k = 0; k < 30; k++) px(Math.floor(r() * BACKDROP_W), 122 + Math.floor(r() * 38), ['#f7e36b', '#ffffff', '#e98ab0'][k % 3]);
  },
  castle: (px) => {
    sky(px, ['#7ec4ea', '#98d1ef', '#b3ddf2', '#cbe7f3']);
    ridge(px, (x) => 96 + Math.sin(x / 20) * 5, '#9fbf7c');
    box(px, 14, 62, 100, 50, '#a7adb8');
    for (let x = 14; x < 114; x += 8) box(px, x, 58, 5, 4, '#a7adb8'); // battlements
    for (const tx of [10, 52, 104]) {
      box(px, tx, 40, 16, 72, '#959bab');
      for (let x = tx; x < tx + 16; x += 5) box(px, x, 36, 3, 4, '#959bab');
      box(px, tx + 6, 54, 4, 6, '#3d3f52');
      box(px, tx + 7, 20, 1, 16, '#5d5145'); // flagpole
    }
    box(px, 18, 21, 6, 4, '#e43b44');
    box(px, 60, 21, 6, 4, '#0099db');
    box(px, 112, 21, 6, 4, '#63c74d');
    box(px, 56, 88, 16, 24, '#5d4a3a'); // gate
    ridge(px, () => 112, '#7cb45a');
  },
  wilds: (px, r) => {
    sky(px, ['#87c9e3', '#a2d6e8', '#c0e3e6', '#d8ecd9']);
    ridge(px, (x) => 58 + Math.abs(((x * 1.3) % 50) - 25) * 0.9, '#9bb7c9'); // mountains
    for (let layer = 0; layer < 3; layer++) {
      const base = 92 + layer * 18;
      const col = ['#6f9f68', '#4f8a4a', '#3a6e3a'][layer];
      for (let x = -4; x < BACKDROP_W + 4; x += 9 + Math.floor(r() * 5)) tri(px, x, base - 22 - Math.floor(r() * 8), 7, 30, col);
      ridge(px, () => base + 6, col);
    }
  },
  underworld: (px, r) => {
    sky(px, ['#1e1020', '#2a1424', '#3a1a26', '#4d1f24', '#6b2a20']);
    for (let x = 0; x < BACKDROP_W; x += 7) tri(px, x, -2, 3, 10 + Math.floor(r() * 18), '#140a14'); // stalactites
    ridge(px, (x) => 118 + Math.sin(x / 7) * 6, '#2a1418');
    ridge(px, (x) => 138 + Math.sin(x / 5 + 1) * 3, '#e0612f');
    ridge(px, (x) => 144 + Math.sin(x / 4) * 2, '#f2b33d');
  },
  throne: (px) => {
    sky(px, ['#3e2a4f', '#4a3260', '#563b6e', '#61437a']);
    for (const cx of [14, 44, 84, 114]) {
      box(px, cx - 5, 30, 10, 130, '#c9b8d8');
      box(px, cx - 7, 26, 14, 5, '#e2d6ea');
      box(px, cx - 2, 40, 4, 30, '#7b2a3e'); // banner
      tri(px, cx, 70, 2, 4, '#7b2a3e');
    }
    box(px, 50, 0, 28, BACKDROP_H, '#4d3462');
    box(px, 56, 96, 16, BACKDROP_H - 96, '#8b2a3e'); // carpet
    box(px, 60, 70, 8, 26, '#f2b33d'); // throne
    box(px, 56, 84, 16, 6, '#f2b33d');
  },
};

const cache = new Map<WorldId, string>();
/** The region's backdrop as a PNG data URL (browser only). */
export function backdropUrl(world: WorldId): string {
  const hit = cache.get(world);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = BACKDROP_W;
  canvas.height = BACKDROP_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const px: Px = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  DRAW[world](px, rng(world.length * 977));
  const url = canvas.toDataURL('image/png');
  cache.set(world, url);
  return url;
}

// ---------- ambient particles ----------
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

const AMBIENCE: Record<WorldId, { count: number; color: string[]; spawn: (r: () => number) => Particle; size: number; blink?: boolean; streak?: boolean }> = {
  training: { count: 10, color: ['#e0a040', '#c46a2c', '#9fbf63'], size: 2, spawn: (r) => ({ x: r(), y: -0.05 - r() * 0.5, vx: 0.02 + r() * 0.02, vy: 0.04 + r() * 0.03, phase: r() * 6 }) },
  gutter: { count: 40, color: ['#b9c4e0', '#9aa6c8'], size: 1, streak: true, spawn: (r) => ({ x: r() * 1.2, y: -r(), vx: -0.12, vy: 0.9 + r() * 0.3, phase: 0 }) },
  village: { count: 14, color: ['#fff6b0', '#ffffff'], size: 1, spawn: (r) => ({ x: r(), y: r(), vx: 0.01 + r() * 0.02, vy: -0.01 + r() * 0.02, phase: r() * 6 }) },
  castle: { count: 12, color: ['#fff4de', '#e8dcc4'], size: 1, spawn: (r) => ({ x: r(), y: r(), vx: 0.005, vy: 0.01 + r() * 0.01, phase: r() * 6 }) },
  wilds: { count: 16, color: ['#e9f56b', '#b6f06a'], size: 2, blink: true, spawn: (r) => ({ x: r(), y: 0.3 + r() * 0.7, vx: (r() - 0.5) * 0.03, vy: (r() - 0.5) * 0.03, phase: r() * 6 }) },
  underworld: { count: 22, color: ['#f2b33d', '#e0612f', '#ffdd88'], size: 2, spawn: (r) => ({ x: r(), y: 1 + r() * 0.3, vx: (r() - 0.5) * 0.04, vy: -(0.06 + r() * 0.08), phase: r() * 6 }) },
  throne: { count: 14, color: ['#f2b33d', '#e2d6ea'], size: 1, blink: true, spawn: (r) => ({ x: r(), y: r(), vx: 0, vy: -0.01, phase: r() * 6 }) },
};

/** Runs the particles of `world` on `canvas` until the returned stop function is called. */
export function runAmbience(canvas: HTMLCanvasElement, world: WorldId): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const cfg = AMBIENCE[world];
  const r = Math.random;
  const W = (canvas.width = BACKDROP_W);
  const H = (canvas.height = BACKDROP_H);
  const ps: Particle[] = Array.from({ length: cfg.count }, () => {
    const p = cfg.spawn(r);
    if (p.y < 0 || p.y > 1) p.y = r();
    return p;
  });
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    acc += dt;
    if (acc < 1 / 20) return; // 20 frames a second is plenty, and kind to batteries
    const step = acc;
    acc = 0;
    ctx.clearRect(0, 0, W, H);
    ps.forEach((p, i) => {
      p.phase += step * 2;
      p.x += (p.vx + Math.sin(p.phase) * (cfg.streak ? 0 : 0.01)) * step;
      p.y += p.vy * step;
      if (p.y > 1.05 || p.y < -0.6 || p.x < -0.1 || p.x > 1.2) Object.assign(p, cfg.spawn(r));
      if (cfg.blink && Math.sin(p.phase * 1.7) < 0.2) return;
      ctx.fillStyle = cfg.color[i % cfg.color.length];
      const x = Math.round(p.x * W);
      const y = Math.round(p.y * H);
      if (cfg.streak) ctx.fillRect(x, y, 1, 4);
      else ctx.fillRect(x, y, cfg.size, cfg.size);
    });
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
