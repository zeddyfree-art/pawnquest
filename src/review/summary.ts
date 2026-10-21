// A small summary of a game's review, kept on the game record itself: the full reviews are pruned to the most
// recent games, but quests (review milestones, clean games, comebacks, habit breakers) need every reviewed game.
import { winFor } from './classify';
import { explain } from './explain';
import type { GameReview } from './analyse';

export interface ReviewSummary {
  /** The player's accuracy, 0–100 (null if too short). */
  accuracy: number | null;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  /** Mistake kinds of the player's key moments ("Hanging piece", "Missed a fork" …). */
  kinds: string[];
  /** The player's lowest winning chance during the game, 0–100. */
  minWinPct: number;
}

export function summarizeReview(r: GameReview, firstMover: 'white' | 'black' = 'white'): ReviewSummary {
  const me = r.playerSide;
  const mine = (ply: number) => (ply % 2 === 0) === (firstMover === me);
  const count = (l: string) => r.labels.filter((x, ply) => x === l && mine(ply)).length;
  const kinds: string[] = [];
  for (const m of r.moments) {
    if (m.side !== me || !['inaccuracy', 'mistake', 'blunder'].includes(m.label)) continue;
    try {
      kinds.push(explain(m).theme);
    } catch {
      // A moment that cannot be explained simply does not add a kind.
    }
  }
  return {
    accuracy: r.accuracy[me],
    blunders: count('blunder'),
    mistakes: count('mistake'),
    inaccuracies: count('inaccuracy'),
    kinds,
    minWinPct: Math.round(Math.min(100, ...r.evals.map((e) => winFor(e, me)))),
  };
}
