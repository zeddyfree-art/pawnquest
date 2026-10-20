// Thin helpers around chessops. A game is stored as plain data: the moves in standard UCI (castling as the
// king moving two squares, e.g. e1g1, which is also what Maia uses), replayed from the starting position.
import { Chess } from 'chessops/chess';
import { INITIAL_FEN, makeFen, parseFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { parseSan } from 'chessops/san';
import { chessgroundDests } from 'chessops/compat';
import { makeSquare, parseSquare, parseUci } from 'chessops/util';
import type { Move, NormalMove, Role } from 'chessops/types';

export type Side = 'white' | 'black';
export const START_FEN = INITIAL_FEN;
export const other = (s: Side): Side => (s === 'white' ? 'black' : 'white');

export function posFromFen(fen: string): Chess {
  return Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
}
export const fenOf = (pos: Chess) => makeFen(pos.toSetup());
/** Position identity for repetition: board, side to move, castling rights, legal en-passant square. */
export const repetitionKey = (pos: Chess) => fenOf(pos).split(' ').slice(0, 4).join(' ');

/** chessops plays castling as "king takes own rook"; turn a standard UCI move into a chessops move. */
export function moveFromUci(pos: Chess, uci: string): Move | undefined {
  const move = parseUci(uci);
  if (!move || !('from' in move)) return move;
  const piece = pos.board.get(move.from);
  if (piece?.role === 'king' && Math.abs((move.from & 7) - (move.to & 7)) === 2) {
    return { from: move.from, to: (move.from & ~7) + ((move.to & 7) > (move.from & 7) ? 7 : 0) };
  }
  return move;
}

/** A legal chessops move as standard UCI (castling as e1g1 / e1c1). */
export function uciOf(pos: Chess, move: NormalMove): string {
  let to = move.to;
  const piece = pos.board.get(move.from);
  const target = pos.board.get(move.to);
  if (piece?.role === 'king' && target?.role === 'rook' && target.color === piece.color) {
    to = (move.from & ~7) + ((move.to & 7) > (move.from & 7) ? 6 : 2);
  }
  return makeSquare(move.from) + makeSquare(to) + (move.promotion ? move.promotion[0] === 'k' ? 'n' : move.promotion[0] : '');
}

export interface Replay {
  pos: Chess;
  fens: string[];
  sans: string[];
  /** Repetition keys of every position, the start included. */
  keys: string[];
  /** From/to squares of the last move, for highlighting. */
  lastMove: [string, string] | null;
}

/** Replays standard UCI moves; throws on an illegal move (stored games are always legal). */
export function replay(moves: readonly string[], startFen = START_FEN): Replay {
  const pos = posFromFen(startFen);
  const fens = [fenOf(pos)];
  const keys = [repetitionKey(pos)];
  const sans: string[] = [];
  let lastMove: [string, string] | null = null;
  for (const uci of moves) {
    const move = moveFromUci(pos, uci);
    if (!move || !pos.isLegal(move)) throw new Error(`Illegal move ${uci} at ${fenOf(pos)}`);
    sans.push(makeSan(pos, move));
    pos.play(move);
    fens.push(fenOf(pos));
    keys.push(repetitionKey(pos));
    lastMove = [uci.slice(0, 2), uci.slice(2, 4)];
  }
  return { pos, fens, sans, keys, lastMove };
}

export function legalUcis(pos: Chess): string[] {
  const out: string[] = [];
  for (const [from, dests] of pos.allDests()) {
    const piece = pos.board.get(from)!;
    for (const to of dests) {
      const promo = piece.role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0);
      if (promo) for (const p of ['queen', 'rook', 'bishop', 'knight'] as Role[]) out.push(uciOf(pos, { from, to, promotion: p }));
      else out.push(uciOf(pos, { from, to }));
    }
  }
  return out;
}

export const dests = (pos: Chess) => chessgroundDests(pos);

/** A drag on the board as standard UCI, or null when it is not legal. Pawns reaching the last rank need `promotion`. */
export function uciFromBoard(pos: Chess, orig: string, dest: string, promotion?: Role): string | null {
  const from = parseSquare(orig);
  const to = parseSquare(dest);
  if (from === undefined || to === undefined) return null;
  const uci = orig + dest + (promotion ? (promotion === 'knight' ? 'n' : promotion[0]) : '');
  const move = moveFromUci(pos, uci);
  if (!move || !pos.isLegal(move)) return null;
  return uciOf(pos, move as NormalMove);
}

export function needsPromotion(pos: Chess, orig: string, dest: string): boolean {
  const from = parseSquare(orig);
  const to = parseSquare(dest);
  if (from === undefined || to === undefined) return false;
  return pos.board.get(from)?.role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0);
}

export function sanToUci(pos: Chess, san: string): string | null {
  const move = parseSan(pos, san);
  return move && 'from' in move ? uciOf(pos, move) : null;
}

export function uciToSan(pos: Chess, uci: string): string {
  const move = moveFromUci(pos, uci);
  return move ? makeSan(pos, move) : uci;
}

/** Non-pawn material of one side in pawns (N/B 3, R 5, Q 9). */
export function pieceMaterial(pos: Chess, side: Side): number {
  const b = pos.board;
  const mine = b[side];
  return 3 * b.knight.intersect(mine).size() + 3 * b.bishop.intersect(mine).size() + 5 * b.rook.intersect(mine).size() + 9 * b.queen.intersect(mine).size();
}

/** Material balance for the HP-style bar and reactions: white minus black, in pawns. */
export function materialBalance(pos: Chess): number {
  const b = pos.board;
  const pawns = (s: Side) => b.pawn.intersect(b[s]).size();
  return pieceMaterial(pos, 'white') + pawns('white') - pieceMaterial(pos, 'black') - pawns('black');
}
