// Victory effects: a few seconds of particles over the result screen after a win. One unlocks at each of a few
// levels; the player picks one on the Hero screen ('auto' is the newest unlocked). Drawn on a canvas as small
// pixel squares, like the region ambience, and skipped when motion is off.
export type EffectId = 'confetti' | 'leaves' | 'fireflies' | 'fireworks' | 'snow' | 'wisps';

export const EFFECTS: { id: EffectId; name: string; level: number }[] = [
  { id: 'confetti', name: 'Confetti', level: 3 },
  { id: 'leaves', name: 'Falling leaves', level: 5 },
  { id: 'fireflies', name: 'Fireflies', level: 8 },
  { id: 'fireworks', name: 'Fireworks', level: 12 },
  { id: 'snow', name: 'Snowfall', level: 16 },
  { id: 'wisps', name: 'Ghost lights', level: 20 },
];

/** The effect to play after a win, or null. */
export function effectFor(setting: string, level: number): EffectId | null {
  const open = EFFECTS.filter((e) => e.level <= level);
  if (setting === 'none' || !open.length) return null;
  if (setting === 'auto') return open[open.length - 1].id;
  return open.find((e) => e.id === setting)?.id ?? open[open.length - 1].id;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  /** Age at which it appears (seconds). */
  born: number;
  phase: number;
}

const PALETTE: Record<EffectId, string[]> = {
  confetti: ['#e43b44', '#feae34', '#63c74d', '#0099db', '#b55088', '#fee761'],
  leaves: ['#e8833a', '#d0443a', '#f2b33d', '#a8743f', '#c9a04a'],
  fireflies: ['#fee761', '#f8f0a0', '#c8f07a'],
  fireworks: ['#e43b44', '#feae34', '#fee761', '#63c74d', '#2ce8f5', '#f6757a'],
  snow: ['#ffffff', '#eef4fb', '#dbe8f5'],
  wisps: ['#9ae8ff', '#c9b8ff', '#e8fbff'],
};

const DURATION = 4.5;

/** Plays the effect on the canvas; returns a function that stops it. */
export function playVictory(canvas: HTMLCanvasElement, id: EffectId): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const scale = 3; // big chunky pixels
  const w = Math.ceil(innerWidth / scale);
  const h = Math.ceil(innerHeight / scale);
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false;
  const colors = PALETTE[id];
  const pick = () => colors[Math.floor(Math.random() * colors.length)];
  const ps: P[] = [];
  const add = (p: Partial<P>) => ps.push({ x: 0, y: 0, vx: 0, vy: 0, size: 1, color: pick(), life: DURATION, born: 0, phase: Math.random() * 6.28, ...p });

  if (id === 'confetti') for (let i = 0; i < 140; i++) add({ x: w / 2 + (Math.random() - 0.5) * 20, y: h * 0.75, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 90, size: 1 + Math.round(Math.random()), born: Math.random() * 0.4 });
  if (id === 'leaves') for (let i = 0; i < 60; i++) add({ x: Math.random() * w, y: -5 - Math.random() * h * 0.6, vx: 6, vy: 14 + Math.random() * 10, size: 2, born: Math.random() * 1.5 });
  if (id === 'fireflies') for (let i = 0; i < 45; i++) add({ x: Math.random() * w, y: h * 0.3 + Math.random() * h * 0.7, vx: (Math.random() - 0.5) * 8, vy: -3 - Math.random() * 6, size: 1, born: Math.random() * 1.2 });
  if (id === 'snow') for (let i = 0; i < 110; i++) add({ x: Math.random() * w, y: -5 - Math.random() * h, vx: 0, vy: 10 + Math.random() * 12, size: 1 + (Math.random() < 0.3 ? 1 : 0), born: Math.random() * 1.5 });
  if (id === 'wisps') for (let i = 0; i < 26; i++) add({ x: Math.random() * w, y: h + Math.random() * 20, vx: 0, vy: -10 - Math.random() * 10, size: 2, born: Math.random() * 1.6 });
  if (id === 'fireworks')
    for (let b = 0; b < 6; b++) {
      const cx = w * (0.15 + Math.random() * 0.7);
      const cy = h * (0.15 + Math.random() * 0.35);
      const color = pick();
      const born = b * 0.55 + Math.random() * 0.2;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const v = 28 + Math.random() * 14;
        add({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color, born, life: 1.6 });
      }
    }

  let raf = 0;
  const start = performance.now();
  let last = start;
  const frame = (now: number) => {
    const t = (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    for (const p of ps) {
      const age = t - p.born;
      if (age < 0 || age > p.life) continue;
      if (id === 'confetti') {
        p.vy += 70 * dt;
        p.vx *= 0.985;
      } else if (id === 'leaves') {
        p.vx = Math.sin(age * 2 + p.phase) * 14;
      } else if (id === 'fireflies' || id === 'wisps') {
        p.vx = Math.sin(age * 1.6 + p.phase) * (id === 'wisps' ? 10 : 6);
      } else if (id === 'snow') {
        p.vx = Math.sin(age + p.phase) * 4;
      } else if (id === 'fireworks') {
        p.vy += 18 * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Fade out over the last part of its life; fireflies and wisps pulse.
      let alpha = Math.min(1, (p.life - age) / 0.8);
      if (id === 'fireflies' || id === 'wisps') alpha *= 0.55 + 0.45 * Math.sin(age * 5 + p.phase);
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      if (id === 'leaves') ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 1, 1, 1);
      if (id === 'wisps') {
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, p.size + 2, p.size + 2);
      }
    }
    ctx.globalAlpha = 1;
    if (t < DURATION + 0.5) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
