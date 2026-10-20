// Turning Maia's move probabilities into one move, with the same knobs as the Maia-3 UCI engine:
// temperature (0 = always the most likely move) and top-p (nucleus; 1 = off). Pure, with an injectable
// random source so tests are exact.

export interface MoveProb {
  uci: string;
  p: number;
}

/** Re-weight probabilities by temperature: p^(1/T), renormalised. T <= 0 puts everything on the top move. */
export function applyTemperature(moves: readonly MoveProb[], temperature: number): MoveProb[] {
  if (!moves.length) return [];
  const sorted = [...moves].sort((a, b) => b.p - a.p);
  if (temperature <= 0) return sorted.map((m, i) => ({ uci: m.uci, p: i === 0 ? 1 : 0 }));
  const logs = sorted.map((m) => Math.log(Math.max(m.p, 1e-12)) / temperature);
  const max = Math.max(...logs);
  const w = logs.map((l) => Math.exp(l - max));
  const sum = w.reduce((a, b) => a + b, 0);
  return sorted.map((m, i) => ({ uci: m.uci, p: w[i] / sum }));
}

/** Keep the most likely moves whose probabilities add up to `topP` (always at least one), renormalised. */
export function applyTopP(moves: readonly MoveProb[], topP: number): MoveProb[] {
  const sorted = [...moves].sort((a, b) => b.p - a.p);
  if (topP >= 1) return sorted;
  const kept: MoveProb[] = [];
  let acc = 0;
  for (const m of sorted) {
    kept.push(m);
    acc += m.p;
    if (acc >= topP) break;
  }
  const sum = kept.reduce((a, m) => a + m.p, 0);
  return kept.map((m) => ({ uci: m.uci, p: m.p / sum }));
}

export function pick(moves: readonly MoveProb[], rand: () => number = Math.random): string | null {
  if (!moves.length) return null;
  let r = rand();
  for (const m of moves) {
    r -= m.p;
    if (r < 0) return m.uci;
  }
  return moves[moves.length - 1].uci;
}

export interface SampleOptions {
  temperature: number;
  topP: number;
  /** Moves below this probability (before temperature) are never chosen. */
  minProbability?: number;
  /** Chance (0–1) of a uniformly random legal move instead. */
  blunderChance?: number;
  rand?: () => number;
}

export function sampleMove(moves: readonly MoveProb[], legal: readonly string[], o: SampleOptions): { uci: string; random: boolean } | null {
  const rand = o.rand ?? Math.random;
  if (o.blunderChance && legal.length && rand() < o.blunderChance) {
    return { uci: legal[Math.floor(rand() * legal.length) % legal.length], random: true };
  }
  const allowed = new Set(legal);
  let pool = moves.filter((m) => allowed.has(m.uci));
  const floor = o.minProbability ?? 0;
  if (floor > 0 && pool.some((m) => m.p >= floor)) pool = pool.filter((m) => m.p >= floor);
  const uci = pick(applyTopP(applyTemperature(pool, o.temperature), o.topP), rand);
  return uci ? { uci, random: false } : legal.length ? { uci: legal[0], random: true } : null;
}
