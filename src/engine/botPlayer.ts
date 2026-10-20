// How a character plays: book first, then Maia at its engine Elo with its temperament; a random move now and
// then at the lowest ranks; a human-looking think time; resigning and answering draw offers.
// Pure apart from the injected `predict`, so it runs the same in the app, in tests and in calibration.
import type { Chess } from 'chessops/chess';
import { BOT, MIN_MOVE_PROBABILITY, rankTemperatureFactor, TEMPERAMENTS, type ModelId } from '../config';
import type { Character } from '../data/characters';
import { legalUcis, pieceMaterial, replay, type Side } from '../game/chess';
import { bookMoves } from './book';
import { pick, sampleMove, type MoveProb } from './sampling';

export interface PredictRequest {
  /** Every position of the game so far as FEN, the current one last; Maia looks at the last 8. */
  fens: string[];
  selfElo: number;
  oppoElo: number;
  model: ModelId;
}
export interface Prediction {
  moves: MoveProb[];
  /** Expected score for the side to move, 0–1 (Maia's value head). */
  winChance: number;
}
export type Predict = (req: PredictRequest) => Promise<Prediction>;

export type MoveSource = 'book' | 'maia' | 'random';
export interface BotMove {
  uci: string;
  source: MoveSource;
  /** The bot's own winning chance before its move. */
  winChance: number;
}

export function effectiveSampling(c: Character): { temperature: number; topP: number } {
  const t = TEMPERAMENTS[c.temperament];
  return { temperature: t.temperature * rankTemperatureFactor(c.rating), topP: t.topP };
}

/** `startFen`: the game started from another position ("Try again"); then the bot plays without its book. */
export async function chooseBotMove(c: Character, moves: string[], playerRating: number, predict: Predict, rand: () => number = Math.random, startFen?: string): Promise<BotMove | null> {
  const r = replay(moves, startFen);
  const legal = legalUcis(r.pos);
  if (!legal.length) return null;
  const botSide: Side = r.pos.turn;
  const pred = await predict({ fens: r.fens, selfElo: c.engineElo, oppoElo: playerRating, model: c.model });

  const book = startFen ? new Map<string, number>() : bookMoves(c, botSide, moves);
  const inBook = [...book.entries()].filter(([uci]) => legal.includes(uci));
  if (inBook.length) {
    // Maia's probability at this rating decides between the book's moves (a little floor so rare book moves still appear).
    const weights = inBook.map(([uci, n]) => ({ uci, p: n * Math.max(0.02, pred.moves.find((m) => m.uci === uci)?.p ?? 0) }));
    const sum = weights.reduce((a, w) => a + w.p, 0);
    const uci = pick(weights.map((w) => ({ uci: w.uci, p: w.p / sum })), rand)!;
    return { uci, source: 'book', winChance: pred.winChance };
  }

  const s = effectiveSampling(c);
  const choice = sampleMove(pred.moves, legal, {
    temperature: s.temperature,
    topP: s.topP,
    minProbability: MIN_MOVE_PROBABILITY,
    blunderChance: c.blunderPct / 100,
    rand,
  });
  if (!choice) return null;
  return { uci: choice.uci, source: choice.random ? 'random' : 'maia', winChance: pred.winChance };
}

/** Fake think time in ms: log-normal inside the character's range, never more than a small share of its clock. */
export function thinkTimeMs(c: Character, clockMs: number, ply: number, rand: () => number = Math.random): number {
  const [lo, hi] = c.think;
  // Box–Muller: a bell curve around the middle of the range on a log scale.
  const g = Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-6))) * Math.cos(2 * Math.PI * rand());
  const mid = Math.sqrt(lo * hi);
  let s = Math.exp(Math.log(mid) + g * (Math.log(hi / lo) / 4));
  s = Math.min(hi, Math.max(lo, s));
  if (ply < 8) s = Math.min(s, lo + 1); // opening moves come quickly
  const cap = (clockMs / 1000) * BOT.maxClockShare;
  return Math.round(1000 * Math.max(BOT.minThink, Math.min(s, cap)));
}

/** Resign after `resignMoves` own moves in a row with a hopeless position (never at the lowest ranks). */
export function shouldResign(c: Character, ownWinChances: readonly number[]): boolean {
  if (c.rating < BOT.resignFromRating) return false;
  const recent = ownWinChances.slice(-BOT.resignMoves);
  return recent.length === BOT.resignMoves && recent.every((w) => w < BOT.resignWinChance);
}

/** Accept a draw offer only in an endgame and only when the bot is not better (Mobile Maia's rule, adapted). */
export function acceptsDraw(pos: Chess, winChance: number): boolean {
  const endgame = pieceMaterial(pos, 'white') <= BOT.drawEndgameMaterial && pieceMaterial(pos, 'black') <= BOT.drawEndgameMaterial;
  return endgame && winChance <= BOT.drawAcceptWinChance;
}
