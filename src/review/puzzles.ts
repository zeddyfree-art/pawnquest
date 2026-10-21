// The puzzle book: every key moment of a review where the player missed a clearly better move becomes a puzzle
// ("find the better move"), kept with the save so it outlives the full review. Hints come in steps, as in the
// Repertoire app: first the piece to move, then the idea (the kind of mistake), then the move itself.
import { posFromFen, type Side } from '../game/chess';
import type { GameReview } from './analyse';
import { scoreCp, winFor } from './classify';
import { explain } from './explain';

export interface Puzzle {
  /** `${gameId}:${ply}`. */
  id: string;
  gameId: string;
  characterId: string;
  ply: number;
  /** Position before the move; the player is to move. */
  fen: string;
  side: Side;
  /** The move played in the game (UCI). */
  played: string;
  /** Moves about as good as the best, best first (UCI). */
  good: string[];
  /** The engine's line from the position, starting with the best move (UCI; older puzzles may not have it). */
  line?: string[];
  /** The best move's evaluation, White's view (to judge other moves by). */
  bestEval: number;
  /** The kind of mistake ("Missed a fork" …), for the idea hint. */
  theme: string;
  date: string;
}

export interface PuzzleTry {
  solved: boolean;
  /** Solved with the first move tried, without showing the move. */
  firstTry: boolean;
  date: string;
}

/** The idea, without giving the move away. */
const IDEA: Record<string, string> = {
  'Allowed mate': 'The move played allowed a mate. Look at the checks your opponent would get.',
  'Missed mate': 'There is a mate here. Look at every check.',
  'Hanging piece': 'The move played left a piece hanging. What is attacked and not defended?',
  'Allowed a fork': 'The move played allowed a fork. Where could an enemy piece attack two of yours?',
  'Missed a fork': 'Look for a fork: one piece attacking two at once.',
  'Missed a capture': 'Something can be taken for free here.',
  'Missed a pin': 'Look for a pin: a piece that cannot move without exposing a bigger one.',
  'Allowed a pin': 'The move played walked into a pin.',
  'Missed a threat': 'Your opponent threatens something. What, and how do you stop it?',
  'Missed a win': 'There is a forced win here. Look for the most forcing move.',
};
export const ideaHint = (theme: string) => IDEA[theme] ?? 'Look for the move that keeps your position together, or improves it the most.';

/** The player's mistakes and blunders of a review, as puzzles. */
export function puzzlesFrom(review: GameReview, game: { id: string; characterId: string; date: string }): Puzzle[] {
  const out: Puzzle[] = [];
  for (const m of review.moments) {
    if (m.side !== review.playerSide || (m.label !== 'mistake' && m.label !== 'blunder') || !m.line[0]) continue;
    let theme = 'Positional';
    try {
      theme = explain(m).theme;
    } catch {
      // No explanation: the puzzle still works, with the general idea hint.
    }
    out.push({
      id: `${game.id}:${m.ply}`,
      gameId: game.id,
      characterId: game.characterId,
      ply: m.ply,
      fen: m.fen,
      side: m.side,
      played: m.played,
      good: m.good.length ? m.good : [m.line[0]],
      line: m.line.slice(0, 8),
      bestEval: m.bestEval,
      theme,
      date: game.date,
    });
  }
  return out;
}

/** A move counts when it is one of the good moves, mates, or (by the engine) loses at most this much winning chance. */
export const PUZZLE_TOLERANCE = 6;

export type Analyse = (fen: string) => Promise<{ cp?: number; mate?: number } | undefined>;

/** Is this move as good as the answer? Asks the engine only for a move outside the stored good moves. */
export async function judgeMove(p: Puzzle, uci: string, fenAfter: string, analyse: Analyse): Promise<boolean> {
  if (p.good.includes(uci)) return true;
  if (uci === p.played) return false;
  const after = posFromFen(fenAfter);
  if (after.isCheckmate()) return true;
  const line = await analyse(fenAfter);
  if (!line) return false;
  return winFor(p.bestEval, p.side) - winFor(scoreCp(line), p.side) <= PUZZLE_TOLERANCE;
}

/** Solved puzzles, and those solved at the first try. */
export function puzzleCounts(log: Record<string, PuzzleTry>): { solved: number; firstTry: number } {
  const all = Object.values(log);
  return { solved: all.filter((t) => t.solved).length, firstTry: all.filter((t) => t.firstTry).length };
}
