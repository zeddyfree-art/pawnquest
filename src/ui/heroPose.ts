/** Pose the registered hero layers, keeping held items rigid and attached to the wrists.
 * Coordinates use the painted 192×256 canvas. No save/equipment data is changed. */
import type { MainKind, OffKind } from './hero';

export type Point = readonly [number, number];
export interface AdventurePose {
  main?: MainKind;
  off?: OffKind;
}
export const WRISTS = { main: [56, 174], off: [136, 174] } as const;
const radians = (degrees: number) => degrees * Math.PI / 180;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function armLift(pose: AdventurePose): Point {
  if (pose.main === 'lute') return [11, -16];
  if (pose.main === 'bow') return [5, -9];
  if (pose.main === 'staff' || pose.main === 'firestaff') return [5, -7];
  return [7, -11];
}

/** Continuous deformation shared by skin, sleeves, clothes, head, hair and accessories. */
export function posedPoint([x, y]: Point, pose: AdventurePose): Point {
  // A slight lean over the planted leg. It fades out across the hips, not at the neck.
  const lean = clamp((190 - y) / 60);
  const angle = radians(-4) * lean;
  const dx = x - 96;
  const dy = y - 184;
  let px = 96 + dx * Math.cos(angle) - dy * Math.sin(angle);
  let py = 184 + dx * Math.sin(angle) + dy * Math.cos(angle);
  // Tall hats already reach the old canvas top; reserve room for their tilted right edge.
  py += 8 * clamp((130 - y) / 130);
  const leg = clamp((y - 184) / 46);
  px += Math.tanh(dx / 10) * 7 * leg;
  py -= clamp(dx / 16) * 3 * leg;
  // Bend the forearms towards the equipment grip. Neck and face have no arm influence.
  const forearm = clamp((y - 138) / 36) * clamp((192 - y) / 18);
  const left = clamp((80 - x) / 24) * forearm;
  const right = clamp((x - 112) / 24) * forearm;
  const [mx, my] = armLift(pose);
  px += mx * left + (pose.off ? -3 : 3) * right;
  py += my * left + (pose.off ? -10 : -4) * right;
  return [px, py];
}

export function itemAngle(pose: AdventurePose, hand: 'main' | 'off'): number {
  if (hand === 'off') return radians(pose.off === 'shield' || pose.off === 'buckler' ? 9 : 3);
  if (pose.main === 'staff' || pose.main === 'firestaff') return radians(-8);
  if (pose.main === 'bow') return radians(-9);
  if (pose.main === 'lute') return radians(14);
  return radians(-23);
}

/** The same wrist location drives the bent sleeve/hand and the rigid item transform. */
export function posedItemPoint(point: Point, pose: AdventurePose, hand: 'main' | 'off'): Point {
  const wrist = WRISTS[hand];
  const target = posedPoint(wrist, pose);
  const angle = itemAngle(pose, hand);
  const dx = point[0] - wrist[0];
  const dy = point[1] - wrist[1];
  return [target[0] + dx * Math.cos(angle) - dy * Math.sin(angle), target[1] + dx * Math.sin(angle) + dy * Math.cos(angle)];
}

const maps = new Map<string, Float32Array>();
/** Inverse lookup avoids cracks/holes at joints. Reused for all skins, moods and equipment colours. */
function inverseMap(pose: AdventurePose, w: number, h: number): Float32Array {
  const key = JSON.stringify([armLift(pose), !!pose.off, w, h]);
  const hit = maps.get(key);
  if (hit) return hit;
  const map = new Float32Array(w * h * 2);
  const scale = w / 192;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const tx = (x + 0.5) / scale;
    const ty = (y + 0.5) / scale;
    let sx = tx;
    let sy = ty;
    for (let n = 0; n < 12; n++) {
      const p = posedPoint([sx, sy], pose);
      sx += (tx - p[0]) * 0.8;
      sy += (ty - p[1]) * 0.8;
    }
    const i = (y * w + x) * 2;
    map[i] = sx * scale - 0.5;
    map[i + 1] = sy * scale - 0.5;
  }
  maps.set(key, map);
  return map;
}

export function poseFigure(source: HTMLCanvasElement, pose: AdventurePose): HTMLCanvasElement {
  const { width: w, height: h } = source;
  const result = document.createElement('canvas'); result.width = w; result.height = h;
  const input = source.getContext('2d')?.getImageData(0, 0, w, h);
  const ctx = result.getContext('2d');
  if (!input || !ctx) return source;
  const out = ctx.createImageData(w, h);
  const map = inverseMap(pose, w, h);
  // Premultiplied bilinear sampling keeps transparent edges free of dark fringes.
  for (let i = 0; i < w * h; i++) {
    const sx = map[i * 2], sy = map[i * 2 + 1];
    const x = Math.floor(sx), y = Math.floor(sy), fx = sx - x, fy = sy - y;
    let a = 0, r = 0, g = 0, b = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
      const j = (yy * w + xx) * 4;
      const weight = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * input.data[j + 3];
      a += weight; r += input.data[j] * weight; g += input.data[j + 1] * weight; b += input.data[j + 2] * weight;
    }
    if (!a) continue;
    out.data[i * 4] = r / a; out.data[i * 4 + 1] = g / a; out.data[i * 4 + 2] = b / a; out.data[i * 4 + 3] = a;
  }
  ctx.putImageData(out, 0, 0);
  return result;
}

export function drawPosedItem(ctx: CanvasRenderingContext2D, source: CanvasImageSource, pose: AdventurePose, hand: 'main' | 'off'): void {
  const wrist = WRISTS[hand];
  const target = posedPoint(wrist, pose);
  ctx.save();
  ctx.translate(target[0], target[1]);
  ctx.rotate(itemAngle(pose, hand));
  ctx.translate(-wrist[0], -wrist[1]);
  ctx.drawImage(source, 0, 0, 192, 256);
  ctx.restore();
}

/** Kept separate from the canonical layers so item icons and rival figures keep their registration. */
export function composeAdventureFigure(figure: HTMLCanvasElement, pose: AdventurePose, main?: CanvasImageSource | null, off?: CanvasImageSource | null): HTMLCanvasElement {
  const final = document.createElement('canvas'); final.width = 192; final.height = 256;
  const ctx = final.getContext('2d');
  if (!ctx) return figure;
  ctx.fillStyle = 'rgba(59, 38, 23, 0.22)';
  ctx.beginPath(); ctx.ellipse(96, 232, 49, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(poseFigure(figure, pose), 0, 0);
  if (main) drawPosedItem(ctx, main, pose, 'main');
  if (off) drawPosedItem(ctx, off, pose, 'off');
  // Fingers close over grips. Instruments, shields and books remain in front of the holding hand.
  if (main || off) {
    const hands = document.createElement('canvas'); hands.width = 192; hands.height = 256;
    const hand = hands.getContext('2d');
    if (hand) {
      if (main && pose.main !== 'lute') hand.drawImage(figure, 49, 166, 17, 16, 49, 166, 17, 16);
      if (off && !['shield', 'buckler', 'book'].includes(pose.off ?? '')) hand.drawImage(figure, 127, 166, 17, 16, 127, 166, 17, 16);
      ctx.drawImage(poseFigure(hands, pose), 0, 0);
    }
  }
  return final;
}
