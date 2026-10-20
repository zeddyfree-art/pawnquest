// The Play button: pick a fitting opponent. Aim a little above the player (expected score about 0.4–0.5),
// a little below after a losing streak; rotate factions so training stays broad, and every third auto-match
// pick the faction the player scores worst against. Colours alternate.
import { MATCHMAKING } from '../config';
import { CHARACTERS, type Character } from '../data/characters';
import type { Side } from './chess';
import { factionScores, lossStreak, type GameRecord } from './progress';

const MAIN_FACTIONS = ['gambiteer', 'classicist', 'strategist'] as const;

export function targetRating(rating: number, history: readonly GameRecord[]): number {
  return lossStreak(history) >= MATCHMAKING.lossStreakForEasier ? rating - MATCHMAKING.belowBy : rating + MATCHMAKING.aboveBy;
}

/** The ladder rank closest to `target` (ties go to the lower rank). The final boss is never auto-picked. */
export function nearestRank(target: number, roster: readonly Character[] = CHARACTERS): number {
  const ranks = [...new Set(roster.filter((c) => c.faction !== 'boss').map((c) => c.rating))].sort((a, b) => a - b);
  return ranks.reduce((best, r) => (Math.abs(r - target) < Math.abs(best - target) ? r : best), ranks[0]);
}

export function autoMatch(rating: number, history: readonly GameRecord[], roster: readonly Character[] = CHARACTERS): { character: Character; color: Side } {
  const rank = nearestRank(targetRating(rating, history), roster);
  const atRank = roster.filter((c) => c.rating === rank && c.faction !== 'boss');
  const autoGames = history.filter((g) => g.auto).length;
  let faction: string = MAIN_FACTIONS[autoGames % MAIN_FACTIONS.length];
  if ((autoGames + 1) % MATCHMAKING.weaknessEvery === 0) {
    const scores = factionScores(history);
    const played = MAIN_FACTIONS.filter((f) => scores[f] !== null);
    if (played.length) faction = played.reduce((w, f) => (scores[f]! < scores[w]! ? f : w), played[0]);
  }
  const character = atRank.find((c) => c.faction === faction) ?? atRank[0];
  const last = history[history.length - 1];
  const color: Side = last ? (last.color === 'white' ? 'black' : 'white') : 'white';
  return { character, color };
}
