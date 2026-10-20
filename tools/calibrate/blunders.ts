// How often each character errs: Stockfish (depth 10) looks at every position of a sample of calibration games
// (run with --moves) and every move gets the Win% it lost. Thresholds as on Lichess: inaccuracy 10, mistake 20,
// blunder 30 Win%. Also counts the deliberate random moves of the lowest ranks.
//
//   npx tsx tools/calibrate/blunders.ts <run name>
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { CHARACTERS } from '../../src/data/characters';
import { replay } from '../../src/game/chess';
import { NodeEngine } from '../../src/review/nodeEngine';
import { moveAccuracy, scoreCp, winFor } from '../../src/review/classify';

const name = process.argv[2] ?? 'sample';
type Row = { white: string; black: string; moves: string[]; random: number[] };
const games: Row[] = readFileSync(`.cache/calibration/${name}.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((g) => g.moves);

interface Tally { moves: number; inacc: number; mistake: number; blunder: number; random: number; acc: number[] }
const tally = new Map<string, Tally>(CHARACTERS.map((c) => [c.id, { moves: 0, inacc: 0, mistake: 0, blunder: 0, random: 0, acc: [] }]));

const engines = Array.from({ length: cpus().length }, () => new NodeEngine());
await Promise.all(engines.map((e) => e.ready()));
let next = 0;
let doneCount = 0;
async function work(e: NodeEngine) {
  while (next < games.length) {
    const g = games[next++];
    const fens = replay(g.moves).fens;
    const evals: number[] = [];
    for (const fen of fens) {
      const lines = await e.analyse(fen, { depth: 10 });
      evals.push(lines[0] ? scoreCp(lines[0]) : 0);
    }
    g.moves.forEach((_, ply) => {
      const side = ply % 2 === 0 ? 'white' : 'black';
      const t = tally.get(side === 'white' ? g.white : g.black)!;
      const before = winFor(evals[ply], side);
      const after = winFor(evals[ply + 1], side);
      const loss = Math.max(0, before - after);
      t.moves++;
      t.acc.push(moveAccuracy(before, after));
      if (g.random.includes(ply)) t.random++;
      if (loss >= 30) t.blunder++;
      else if (loss >= 20) t.mistake++;
      else if (loss >= 10) t.inacc++;
    });
    if (++doneCount % 50 === 0) console.log(`${doneCount}/${games.length} games analysed`);
  }
}
await Promise.all(engines.map(work));
engines.forEach((e) => e.quit());

const per40 = (n: number, moves: number) => Number(((40 * n) / Math.max(1, moves)).toFixed(2));
const rows = CHARACTERS.map((c) => {
  const t = tally.get(c.id)!;
  return {
    id: c.id,
    rating: c.rating,
    moves: t.moves,
    accuracy: Math.round(t.acc.reduce((a, b) => a + b, 0) / Math.max(1, t.acc.length)),
    blundersPer40: per40(t.blunder, t.moves),
    mistakesPer40: per40(t.mistake, t.moves),
    inaccuraciesPer40: per40(t.inacc, t.moves),
    randomPer40: per40(t.random, t.moves),
  };
});
console.log('\ncharacter            ladder  moves  acc  blunders  mistakes  inacc  random  (per 40 own moves)');
for (const r of rows) console.log(`${r.id.padEnd(20)} ${String(r.rating).padStart(6)} ${String(r.moves).padStart(6)} ${String(r.accuracy).padStart(4)} ${String(r.blundersPer40).padStart(9)} ${String(r.mistakesPer40).padStart(9)} ${String(r.inaccuraciesPer40).padStart(6)} ${String(r.randomPer40).padStart(7)}`);
writeFileSync(`.cache/calibration/${name}-blunders.json`, JSON.stringify(rows, null, 1));
