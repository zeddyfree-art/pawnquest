// Ladder calibration: every character plays its neighbours (same rank and one rank up or down) with the app's
// own bot, on all CPU cores; then an Elo fit measures each character's strength next to its ladder rating.
//
//   npx tsx tools/calibrate/run.ts [--games 40] [--knobs file.json] [--out name] [--only 1000-1400]
//
// Results go to .cache/calibration/<name>.jsonl (resumable: games already there are not replayed) and a summary
// to .cache/calibration/<name>.json.
import { fork } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { CHARACTERS } from '../../src/data/characters';
import type { Knobs } from '../../src/data/calibration';
import { fitRatings, headToHead, type Result } from './fit';
import type { Job } from './worker';

const arg = (name: string, dflt: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const GAMES = Number(arg('games', '40'));
const NAME = arg('out', 'run');
/** Keep the moves of every game (for analysis with tools/calibrate/blunders.ts). */
const MOVES = process.argv.includes('--moves');
const knobs: Record<string, Knobs> = existsSync(arg('knobs', '')) ? JSON.parse(readFileSync(arg('knobs', ''), 'utf8')) : {};
const [lo, hi] = arg('only', '0-9999').split('-').map(Number);
const dir = '.cache/calibration';
mkdirSync(dir, { recursive: true });
const file = `${dir}/${NAME}.jsonl`;

const ranks = [...new Set(CHARACTERS.map((c) => c.rating))].sort((a, b) => a - b);
const at = (r: number) => CHARACTERS.filter((c) => c.rating === r);
const pairs: [string, string][] = [];
ranks.forEach((r, i) => {
  if (r < lo || r > hi) return;
  const here = at(r);
  for (let a = 0; a < here.length; a++) for (let b = a + 1; b < here.length; b++) pairs.push([here[a].id, here[b].id]);
  const up = ranks[i + 1];
  if (up !== undefined && up <= hi) for (const a of here) for (const b of at(up)) pairs.push([a.id, b.id]);
});

const done: (Result & { key: string })[] = existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const have = new Set(done.map((d) => d.key));
const jobs: (Job & { key: string })[] = [];
let id = 0;
for (const [a, b] of pairs)
  for (let g = 0; g < GAMES; g++) {
    const [white, black] = g % 2 === 0 ? [a, b] : [b, a];
    const key = `${a}|${b}|${g}`;
    if (!have.has(key)) jobs.push({ id: id++, white, black, seed: 1000 + g * 7919 + pairs.findIndex((p) => p[0] === a && p[1] === b) * 104729, key });
  }

console.log(`${pairs.length} pairs × ${GAMES} games: ${jobs.length} to play, ${done.length} already played`);
const results: Result[] = [...done];
const workers = Math.max(1, cpus().length);
let next = 0;
let finished = 0;
const t0 = Date.now();

await new Promise<void>((resolve) => {
  if (!jobs.length) return resolve();
  let alive = 0;
  for (let w = 0; w < workers; w++) {
    const child = fork(new URL('./worker.ts', import.meta.url).pathname, [], { execArgv: ['--import', 'tsx'] });
    alive++;
    const give = () => {
      if (next >= jobs.length) return child.kill();
      child.send({ type: 'job', job: jobs[next++] });
    };
    child.on('message', (m: { type: string; id: number } & Result & { plies: number; end: string; moves: string[]; random: number[] }) => {
      if (m.type === 'ready') {
        child.send({ type: 'knobs', knobs });
        return give();
      }
      const job = jobs.find((j) => j.id === m.id)!;
      const row = { key: job.key, white: m.white, black: m.black, score: m.score, plies: m.plies, end: m.end, ...(MOVES ? { moves: m.moves, random: m.random } : {}) };
      appendFileSync(file, JSON.stringify(row) + '\n');
      results.push(row);
      finished++;
      if (finished % 50 === 0 || finished === jobs.length) {
        const rate = finished / ((Date.now() - t0) / 1000);
        console.log(`${finished}/${jobs.length} games, ${rate.toFixed(2)}/s, ~${Math.round((jobs.length - finished) / rate / 60)} min left`);
      }
      give();
    });
    child.on('exit', () => {
      if (--alive === 0) resolve();
    });
  }
});

const ids = CHARACTERS.filter((c) => c.rating >= lo && c.rating <= hi).map((c) => c.id);
const targets = Object.fromEntries(ids.map((i) => [i, CHARACTERS.find((c) => c.id === i)!.rating]));
const inRange = results.filter((r) => r.white in targets && r.black in targets);
const fitted = fitRatings(inRange, targets);
const rows = ids.map((i) => {
  const c = CHARACTERS.find((x) => x.id === i)!;
  const n = inRange.filter((r) => r.white === i || r.black === i).length;
  return { id: i, rating: c.rating, measured: fitted[i], diff: fitted[i] - c.rating, games: n };
});
console.log('\ncharacter            ladder  measured  diff  games');
for (const r of rows) console.log(`${r.id.padEnd(20)} ${String(r.rating).padStart(6)} ${String(r.measured).padStart(9)} ${String(r.diff).padStart(5)} ${String(r.games).padStart(6)}`);
// Neighbouring ranks: how the lower rank scored against the one above (Elo expects about 24% for 200 points).
console.log('\nrank vs rank above: lower side scored');
ranks.forEach((r, i) => {
  const up = ranks[i + 1];
  if (up === undefined || r < lo || up > hi) return;
  let games = 0;
  let score = 0;
  for (const a of at(r)) for (const b of at(up)) {
    const h = headToHead(inRange, a.id, b.id);
    games += h.games;
    score += h.score;
  }
  const expected = 100 / (1 + 10 ** ((up - r) / 400));
  console.log(`${r} vs ${up}: ${games ? ((100 * score) / games).toFixed(0) : '-'}% (expected ${expected.toFixed(0)}%) over ${games}`);
});
const avgPlies = Math.round(inRange.reduce((a, r) => a + ((r as { plies?: number }).plies ?? 0), 0) / Math.max(1, inRange.length));
writeFileSync(`${dir}/${NAME}.json`, JSON.stringify({ games: inRange.length, avgPlies, knobs, rows }, null, 1));
