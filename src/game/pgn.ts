// A game as PGN (to copy, download, or open on Lichess), with the usual headers plus two of our own:
// [Source "Pawnquest"] and [YourColor "White"|"Black"], so another app (like the Repertoire app) knows where the
// game comes from and which side was yours, whatever name you used.
import { CLOCK } from '../config';
import { posFromFen, replay, START_FEN } from './chess';
import type { GameRecord } from './progress';

const TERMINATION: Record<GameRecord['termination'], string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  insufficient: 'Insufficient material',
  repetition: 'Threefold repetition',
  'fifty-moves': 'Fifty-move rule',
  timeout: 'Time forfeit',
  resign: 'Resignation',
  agreement: 'Draw agreed',
};

export const resultOf = (g: Pick<GameRecord, 'winner'>) => (g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2');

/** "1. e4 e5 2. Nf3", starting with "1... e5" when Black moves first. */
export function movetext(moves: readonly string[], startFen?: string): string {
  const sans = replay(moves, startFen ?? START_FEN).sans;
  const pos = posFromFen(startFen ?? START_FEN);
  let n = pos.fullmoves;
  let white = pos.turn === 'white';
  const out: string[] = [];
  sans.forEach((san, i) => {
    if (white) out.push(`${n}. ${san}`);
    else out.push(i === 0 ? `${n}... ${san}` : san);
    if (!white) n++;
    white = !white;
  });
  return out.join(' ');
}

const quote = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export function gamePgn(g: GameRecord, you: string, opponent: string): string {
  const d = new Date(g.date);
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const white = g.color === 'white' ? you : opponent;
  const black = g.color === 'white' ? opponent : you;
  const result = resultOf(g);
  const headers: [string, string][] = [
    ['Event', g.practice ? 'Pawnquest practice' : 'Pawnquest'],
    ['Site', 'https://zeddyfree-art.github.io/pawnquest/'],
    ['Date', date],
    ['White', white],
    ['Black', black],
    ['Result', result],
    ['WhiteElo', String(g.color === 'white' ? g.ratingBefore : g.opponentRating)],
    ['BlackElo', String(g.color === 'white' ? g.opponentRating : g.ratingBefore)],
    ['TimeControl', `${CLOCK.minutes * 60}+${CLOCK.incrementSeconds}`],
    ['Termination', TERMINATION[g.termination]],
    ['Source', 'Pawnquest'],
    ['YourColor', g.color === 'white' ? 'White' : 'Black'],
    ['PawnquestId', g.id],
  ];
  if (g.startFen) headers.push(['SetUp', '1'], ['FEN', g.startFen]);
  return `${headers.map(([k, v]) => `[${k} "${quote(v)}"]`).join('\n')}\n\n${movetext(g.moves, g.startFen)} ${result}\n`;
}

/** The Lichess analysis board: the whole game at a given half-move (standard start), else just that position. */
export function lichessGameUrl(g: Pick<GameRecord, 'moves' | 'startFen'>, ply?: number): string {
  if (g.startFen) {
    const fen = replay(g.moves.slice(0, ply ?? g.moves.length), g.startFen).fens.at(-1) ?? g.startFen;
    return lichessPositionUrl(fen);
  }
  // Lichess reads "_" (and "+") in this path as spaces; check marks are not needed to read the moves.
  const text = movetext(g.moves).replace(/\+/g, '').replace(/ /g, '_');
  return `https://lichess.org/analysis/pgn/${encodeURIComponent(text)}${ply !== undefined ? `#${ply}` : ''}`;
}

export const lichessPositionUrl = (fen: string) => `https://lichess.org/analysis/standard/${fen.replace(/ /g, '_')}`;
