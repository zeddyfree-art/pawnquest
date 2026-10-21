// Progress derived from the game history: per-character records, crowns, faction scores, XP levels.
import { CROWNS, XP } from '../config';
import type { Faction } from '../data/characters';
import type { Side } from './chess';
import type { Termination } from './rules';
import type { ReviewSummary } from '../review/summary';

export interface GameRecord {
  id: string;
  characterId: string;
  faction: Faction;
  opponentRating: number;
  color: Side;
  moves: string[];
  winner: Side | null;
  termination: Termination;
  /** 1, 0.5 or 0 for the player. */
  score: number;
  ratingBefore: number;
  ratingAfter: number;
  /** ISO date-time the game ended. */
  date: string;
  /** Picked by the Play button (true) or chosen on the map. */
  auto: boolean;
  /** Started from this position ("Try again" from a review). */
  startFen?: string;
  /** Not rated, not in the history. */
  practice?: boolean;
  /** In the history but did not change the rating (training games in v0.5). */
  unrated?: boolean;
  /** When the game started (ISO), the player's clock time used (ms) and the pet along (from v0.7). */
  startedAt?: string;
  timeUsedMs?: number;
  pet?: string | null;
  /** Set once the game is reviewed. */
  review?: ReviewSummary;
}

/** Board endings: the game was decided on the board, not by a resignation or the clock. */
const BOARD_ENDS: Termination[] = ['checkmate', 'stalemate', 'insufficient', 'repetition', 'fifty-moves'];

/** The player's own moves (UCI). */
export const ownMoves = (g: GameRecord) => g.moves.filter((_, i) => (i % 2 === 0) === (g.color === 'white'));

/** Counts towards "games played": not a practice game, and at least 10 own moves or decided on the board. */
export const countsAsGame = (g: GameRecord) => !g.practice && (ownMoves(g).length >= 10 || BOARD_ENDS.includes(g.termination));

export type Crown = 'none' | 'bronze' | 'silver' | 'gold';

export function crownFor(wins: number): Crown {
  if (wins >= CROWNS.gold) return 'gold';
  if (wins >= CROWNS.silver) return 'silver';
  if (wins >= CROWNS.bronze) return 'bronze';
  return 'none';
}

export interface CharacterRecord {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  /** Fewest of your own moves in a win. */
  bestWin: number | null;
  firstWin: string | null;
  crown: Crown;
}

export function characterRecord(history: readonly GameRecord[], characterId: string): CharacterRecord {
  const games = history.filter((g) => g.characterId === characterId);
  const wins = games.filter((g) => g.score === 1);
  const draws = games.filter((g) => g.score === 0.5).length;
  const ownMoves = (g: GameRecord) => Math.ceil((g.moves.length - (g.color === 'black' ? 1 : 0)) / 2);
  return {
    games: games.length,
    wins: wins.length,
    draws,
    losses: games.length - wins.length - draws,
    bestWin: wins.length ? Math.min(...wins.map(ownMoves)) : null,
    firstWin: wins.length ? wins.map((g) => g.date).sort()[0] : null,
    crown: crownFor(wins.length),
  };
}

/** Your score percentage against each faction (null when you have not played it). */
export function factionScores(history: readonly GameRecord[]): Record<'gambiteer' | 'classicist' | 'strategist', number | null> {
  const out = { gambiteer: null, classicist: null, strategist: null } as Record<'gambiteer' | 'classicist' | 'strategist', number | null>;
  for (const f of Object.keys(out) as (keyof typeof out)[]) {
    const games = history.filter((g) => g.faction === f);
    out[f] = games.length ? Math.round((100 * games.reduce((a, g) => a + g.score, 0)) / games.length) : null;
  }
  return out;
}

/** XP for one finished game, including a crown earned with it. */
export function xpForGame(score: number, crownBefore: Crown, crownAfter: Crown): number {
  const base = score === 1 ? XP.win : score === 0.5 ? XP.draw : XP.loss;
  return base + (crownAfter !== crownBefore ? XP.crown : 0);
}

export function levelFor(xp: number): { level: number; into: number; needed: number } {
  return { level: Math.floor(xp / XP.perLevel) + 1, into: xp % XP.perLevel, needed: XP.perLevel };
}

/** Losses in a row at the end of the history. */
export function lossStreak(history: readonly GameRecord[]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0 && history[i].score === 0; i--) n++;
  return n;
}
