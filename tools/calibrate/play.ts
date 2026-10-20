// One game between two characters with the app's own bot (book, Maia, sampling, blunders, resigning).
import { chooseBotMove, shouldResign, type Predict } from '../../src/engine/botPlayer';
import type { Character } from '../../src/data/characters';
import { boardResult } from '../../src/game/rules';

export const MAX_PLIES = 300;

export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GameOutcome {
  white: string;
  black: string;
  /** 1 white won, 0.5 draw, 0 black won. */
  score: number;
  plies: number;
  end: string;
  moves: string[];
  /** Plies where the move was a random one (the low ranks' blunder knob). */
  random: number[];
}

export async function playGame(white: Character, black: Character, predict: Predict, seed: number): Promise<GameOutcome> {
  const rand = rng(seed);
  const moves: string[] = [];
  const wins: Record<'white' | 'black', number[]> = { white: [], black: [] };
  const random: number[] = [];
  const done = (score: number, end: string): GameOutcome => ({ white: white.id, black: black.id, score, plies: moves.length, end, moves, random });
  while (moves.length < MAX_PLIES) {
    const side = moves.length % 2 === 0 ? 'white' : 'black';
    const me = side === 'white' ? white : black;
    const opp = side === 'white' ? black : white;
    const m = await chooseBotMove(me, moves, opp.tier, predict, rand);
    if (!m) break;
    wins[side].push(m.winChance);
    if (m.source !== 'book' && shouldResign(me, wins[side])) {
      return done(side === 'white' ? 0 : 1, 'resign');
    }
    if (m.source === 'random') random.push(moves.length);
    moves.push(m.uci);
    const end = boardResult(moves);
    if (end) return done(end.winner === null ? 0.5 : end.winner === 'white' ? 1 : 0, end.termination);
  }
  return done(0.5, 'cap');
}
