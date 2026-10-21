// Small praise right after a game: up to two good-habit chips (+10 XP each), win or lose, so a careful loss still
// feels like progress. Only what is known at the end of the game counts (no review yet).
import { characterById } from '../data/characters';
import { countsAsGame, ownMoves, type GameRecord } from './progress';

export const CHIP_LABEL: Record<string, string> = {
  time: 'Took your time',
  fight: 'Kept fighting',
  brave: 'Brave choice',
  new: 'New opponent',
};

export function habitChips(g: GameRecord, before: readonly GameRecord[]): string[] {
  if (!countsAsGame(g)) return [];
  const own = ownMoves(g).length;
  const chips: string[] = [];
  if (own >= 10 && (g.timeUsedMs ?? 0) / own >= 8000) chips.push('time');
  if (g.score < 1 && own >= 40 && g.termination !== 'resign') chips.push('fight');
  if (!g.auto && g.opponentRating - g.ratingBefore >= 200) chips.push('brave');
  if (!before.some((x) => x.characterId === g.characterId) && characterById(g.characterId)) chips.push('new');
  return chips.slice(0, 2);
}
