// How good was each move? Lichess' public formulas (lichess.org/page/accuracy): Win% from centipawns, move accuracy
// from the Win% lost, and game accuracy as the volatility-weighted mean blended with the harmonic mean.
// Labels follow the brief: Best (the engine's move), Excellent, Good, Inaccuracy, Mistake, Blunder, and Brilliant
// for a sound sacrifice that is also the engine's best move.
import { REVIEW } from '../config';
import type { Side } from '../game/chess';

export const MATE = 10000;

/** Centipawns or mate (White's view) on one scale: mate in n = ±(10000 − 10n). */
export function scoreCp(l: { cp?: number; mate?: number }): number {
  if (l.mate !== undefined) return Math.sign(l.mate || 1) * (MATE - Math.abs(l.mate) * 10);
  return l.cp ?? 0;
}

/** White's winning chances, 0–100. */
export function winPct(cp: number): number {
  const c = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}
export const winFor = (cp: number, side: Side) => (side === 'white' ? winPct(cp) : 100 - winPct(cp));
export const moverOf = (ply: number, firstMover: Side = 'white'): Side => ((ply % 2 === 0) === (firstMover === 'white') ? 'white' : 'black');

/** Win% the move at `ply` lost for the side that played it (0 when it did not get worse). */
export function lossAt(evals: readonly number[], ply: number, firstMover: Side = 'white'): number {
  const side = moverOf(ply, firstMover);
  return Math.max(0, winFor(evals[ply], side) - winFor(evals[ply + 1], side));
}

export function moveAccuracy(before: number, after: number): number {
  if (after >= before) return 100;
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * (before - after)) - 3.166924740191411;
  return Math.max(0, Math.min(100, raw + 1));
}

function stdDev(xs: number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}

/** Lichess' game accuracy for `side` (null without moves). */
export function accuracy(evals: readonly number[], side: Side, firstMover: Side = 'white'): number | null {
  const wins = evals.map(winPct);
  const moves = wins.length - 1;
  if (moves < 1) return null;
  const size = Math.max(2, Math.min(8, Math.floor(wins.length / 10)));
  const windows: number[][] = [];
  for (let i = 0; i < size - 2 && windows.length < moves; i++) windows.push(wins.slice(0, size));
  for (let i = 0; i + size <= wins.length && windows.length < moves; i++) windows.push(wins.slice(i, i + size));
  while (windows.length < moves) windows.push(wins.slice(-size));
  const weights = windows.map((w) => Math.max(0.5, Math.min(12, stdDev(w))));
  let weighted = 0;
  let weightSum = 0;
  let harmonic = 0;
  let n = 0;
  for (let ply = 0; ply < moves; ply++) {
    if (moverOf(ply, firstMover) !== side) continue;
    const before = side === 'white' ? wins[ply] : 100 - wins[ply];
    const after = side === 'white' ? wins[ply + 1] : 100 - wins[ply + 1];
    const acc = moveAccuracy(before, after);
    weighted += acc * weights[ply];
    weightSum += weights[ply];
    harmonic += 1 / Math.max(acc, 1);
    n++;
  }
  return n ? (weighted / weightSum + n / harmonic) / 2 : null;
}

export type Label = 'brilliant' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
export const LABELS: Label[] = ['brilliant', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];
export const LABEL_INFO: Record<Label, { name: string; symbol: string; color: string }> = {
  brilliant: { name: 'Brilliant', symbol: '!!', color: '#33e1ff' },
  best: { name: 'Best', symbol: '★', color: '#63c74d' },
  excellent: { name: 'Excellent', symbol: '!', color: '#9ad35a' },
  good: { name: 'Good', symbol: '✓', color: '#c0cbdc' },
  inaccuracy: { name: 'Inaccuracy', symbol: '?!', color: '#feae34' },
  mistake: { name: 'Mistake', symbol: '?', color: '#f77622' },
  blunder: { name: 'Blunder', symbol: '??', color: '#e43b44' },
};

/** The label for a move that lost `loss` Win%; `isBest`: it was the engine's move; `sacrifice`: it gives up material. */
export function labelFor(loss: number, isBest: boolean, sacrifice = false): Label {
  if (isBest) return sacrifice ? 'brilliant' : 'best';
  if (loss < REVIEW.excellent) return 'excellent';
  if (loss < REVIEW.good) return 'good';
  if (loss < REVIEW.inaccuracy) return 'inaccuracy';
  if (loss < REVIEW.mistake) return 'mistake';
  return 'blunder';
}

/** "+1.3", "−0.4", "#3", "#−2" */
export function formatEval(v: number): string {
  if (Math.abs(v) > MATE - 1000) {
    const n = Math.round((MATE - Math.abs(v)) / 10);
    return `#${v < 0 ? '−' : ''}${n}`;
  }
  const p = v / 100;
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1)}`;
}
