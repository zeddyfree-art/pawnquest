// One tuning step: from a run's measured ratings and the knobs it used, new knobs that move each character
// towards its ladder rating. Too strong: a higher temperature, a lower engine Elo, and at the bottom of the ladder
// more random moves. Too weak: the reverse.
//
//   npx tsx tools/calibrate/tune.ts <run name> <new knobs file>
import { readFileSync, writeFileSync } from 'node:fs';
import { CHARACTERS } from '../../src/data/characters';
import type { Knobs } from '../../src/data/calibration';

const [name, outFile] = process.argv.slice(2);
const run = JSON.parse(readFileSync(`.cache/calibration/${name}.json`, 'utf8')) as { knobs: Record<string, Knobs>; rows: { id: string; rating: number; measured: number }[] };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const out: Record<string, Knobs> = {};
for (const row of run.rows) {
  const c = CHARACTERS.find((x) => x.id === row.id)!;
  const k = { engineElo: c.engineElo, tempScale: c.tempScale, blunderPct: c.blunderPct, ...run.knobs[row.id] };
  const delta = row.rating - row.measured; // > 0: too weak
  const step = clamp(delta, -400, 400);
  const next: Knobs = {
    engineElo: Math.round(clamp(k.engineElo! + 0.6 * step, 400, 2800)),
    tempScale: Number(clamp(k.tempScale! * Math.exp(-step / 700), 0.1, 3).toFixed(3)),
    blunderPct: k.blunderPct!,
  };
  // Random moves only below 1000, and only to weaken.
  if (c.tier < 1000) next.blunderPct = Number(clamp(k.blunderPct! - step / 40, 0, 30).toFixed(1));
  out[row.id] = next;
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(`wrote ${Object.keys(out).length} characters to ${outFile}`);
