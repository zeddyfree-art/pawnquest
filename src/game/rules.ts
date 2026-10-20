// How a game ends. Pure: given the moves (and, for time, who flagged), say whether it is over and why.
import type { Chess } from 'chessops/chess';
import { other, replay, type Side } from './chess';

export type Termination = 'checkmate' | 'stalemate' | 'insufficient' | 'repetition' | 'fifty-moves' | 'timeout' | 'resign' | 'agreement';

export interface Result {
  /** null = draw */
  winner: Side | null;
  termination: Termination;
}

/** Over by the rules of the board alone (not by clock, resignation or agreement)? */
export function boardResult(moves: readonly string[]): Result | null {
  const r = replay(moves);
  const pos = r.pos;
  if (pos.isCheckmate()) return { winner: other(pos.turn), termination: 'checkmate' };
  if (pos.isStalemate()) return { winner: null, termination: 'stalemate' };
  if (pos.isInsufficientMaterial()) return { winner: null, termination: 'insufficient' };
  const last = r.keys[r.keys.length - 1];
  if (r.keys.filter((k) => k === last).length >= 3) return { winner: null, termination: 'repetition' };
  if (pos.halfmoves >= 100) return { winner: null, termination: 'fifty-moves' };
  return null;
}

/** The side whose flag fell loses, unless the other side cannot possibly mate: then it is a draw. */
export function timeoutResult(pos: Chess, flagged: Side): Result {
  const winner = other(flagged);
  return pos.hasInsufficientMaterial(winner) ? { winner: null, termination: 'timeout' } : { winner, termination: 'timeout' };
}

export function describeResult(r: Result, you: Side): { title: string; detail: string; score: 1 | 0.5 | 0 } {
  const score = r.winner === null ? 0.5 : r.winner === you ? 1 : 0;
  const title = score === 1 ? 'Victory!' : score === 0 ? 'Defeat' : 'Draw';
  const detail: Record<Termination, string> = {
    checkmate: score === 1 ? 'You delivered checkmate.' : 'You were checkmated.',
    stalemate: 'Stalemate: no legal moves, but no check.',
    insufficient: 'Neither side has enough pieces left to mate.',
    repetition: 'The same position came up three times.',
    'fifty-moves': 'Fifty moves without a capture or a pawn move.',
    timeout: score === 1 ? 'Your opponent ran out of time.' : score === 0 ? 'You ran out of time.' : 'Out of time, but there was no way to mate.',
    resign: score === 1 ? 'Your opponent resigned.' : 'You resigned.',
    agreement: 'Draw by agreement.',
  };
  return { title, detail: detail[r.termination], score };
}
