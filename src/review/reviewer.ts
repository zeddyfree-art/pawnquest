// Runs the game reviews, one engine search at a time. Stockfish takes one search at a time (a new one cancels the
// running one), so every caller goes through a small priority lock: the puzzle check first, then a review the
// player opened, then the background reviews. Games that are not reviewed yet are reviewed in the background,
// newest first, but only while no game is being played (the bot needs the device then).
import { characterById } from '../data/characters';
import { maiaPredict } from '../engine/maia';
import { engine, type EngineOptions, type EngineLine } from '../engine/stockfish';
import type { GameRecord } from '../game/progress';
import { useSave } from '../store/save';
import { useNav } from '../ui/nav';
import { reviewGame, type GameReview } from './analyse';

export const PRIORITY = { background: 0, open: 1, puzzle: 2 } as const;
type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

const waiting: { prio: Priority; go: () => void }[] = [];
let locked = false;
async function lock(prio: Priority) {
  if (!locked) {
    locked = true;
    return;
  }
  await new Promise<void>((go) => {
    waiting.push({ prio, go });
    waiting.sort((a, b) => b.prio - a.prio);
  });
}
function unlock() {
  const next = waiting.shift();
  if (next) next.go();
  else locked = false;
}

/** One Stockfish search, in turn. */
export async function analyse(fen: string, opts: EngineOptions, prio: Priority): Promise<EngineLine[]> {
  await lock(prio);
  try {
    return await engine.analyse(fen, opts);
  } finally {
    unlock();
  }
}

/** Resolves when no game is being played. */
function whenIdle(): Promise<void> {
  const idle = () => !useSave.getState().active && useNav.getState().screen !== 'battle';
  if (idle()) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (!idle()) return;
      a();
      b();
      resolve();
    };
    const a = useSave.subscribe(check);
    const b = useNav.subscribe(check);
  });
}

interface Job {
  promise: Promise<GameReview>;
  prio: Priority;
  listeners: Set<(pct: number) => void>;
}
const jobs = new Map<string, Job>();

/** Reviews a game (or joins the review already running for it) and stores the result. */
export function review(g: GameRecord, prio: Priority, onProgress?: (pct: number) => void): Promise<GameReview> {
  const running = jobs.get(g.id);
  if (running) {
    if (onProgress) running.listeners.add(onProgress);
    if (prio > running.prio) running.prio = prio;
    return running.promise;
  }
  const c = characterById(g.characterId);
  if (!c) return Promise.reject(new Error('This opponent is no longer in the game.'));
  const job: Job = { prio, listeners: new Set(onProgress ? [onProgress] : []), promise: Promise.resolve(null as never) };
  const gate = async () => {
    if (job.prio === PRIORITY.background) await whenIdle();
  };
  job.promise = reviewGame(
    { moves: g.moves, startFen: g.startFen, playerSide: g.color, playerRating: g.ratingBefore, opponentRating: c.rating },
    {
      analyse: async (fen, opts) => {
        await gate();
        return analyse(fen, opts, job.prio);
      },
    },
    async (fens, selfElo, oppoElo) => {
      await gate();
      return (await maiaPredict({ fens, selfElo, oppoElo, model: c.model })).moves;
    },
    (done, total) => job.listeners.forEach((f) => f(Math.round((100 * done) / total))),
  )
    .then((r) => {
      useSave.getState().setReview(g.id, r);
      return r;
    })
    .finally(() => jobs.delete(g.id));
  jobs.set(g.id, job);
  return job.promise;
}

/** Games that still need a review, newest first. */
const unreviewed = (history: readonly GameRecord[], failed: Set<string>) =>
  history.filter((g) => !g.review && !g.practice && g.moves.length >= 2 && !failed.has(g.id) && characterById(g.characterId)).reverse();

let started = false;
/** Reviews every game without a review, one after the other, in the background. */
export function startAutoReview() {
  if (started || typeof Worker === 'undefined') return;
  started = true;
  const failed = new Set<string>();
  let running = false;
  const next = async () => {
    if (running) return;
    const g = unreviewed(useSave.getState().history, failed)[0];
    if (!g) return;
    running = true;
    try {
      await review(g, PRIORITY.background);
    } catch {
      failed.add(g.id);
    }
    running = false;
    void next();
  };
  // A new game in the history starts the next round.
  useSave.subscribe((s, before) => {
    if (s.history !== before.history) void next();
  });
  void next();
}
