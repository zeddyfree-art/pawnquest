// The Play button: pick a fitting opponent. Aim a little above the player (expected score about 0.4–0.5),
// a little below after a losing streak; among the three opponents nearest that aim, rotate factions so training stays broad, and every third auto-match
// pick the faction the player scores worst against. Colours alternate.
import { MATCHMAKING } from '../config';
import { CHARACTERS, type Character } from '../data/characters';
import type { Side } from './chess';
import { factionScores, lossStreak, type GameRecord } from './progress';

const MAIN_FACTIONS = ['gambiteer', 'classicist', 'strategist'] as const;

export function targetRating(rating: number, history: readonly GameRecord[]): number {
  return lossStreak(history) >= MATCHMAKING.lossStreakForEasier ? rating - MATCHMAKING.belowBy : rating + MATCHMAKING.aboveBy;
}

/** The opponents closest to `target`, nearest first. Neither the training dummy nor the final boss is auto-picked. */
export function nearestOpponents(target: number, roster: readonly Character[] = CHARACTERS, count = 3): Character[] {
  return roster
    .filter((c) => c.faction !== 'boss' && c.faction !== 'neutral')
    .slice()
    .sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target) || a.rating - b.rating)
    .slice(0, count);
}

export function autoMatch(rating: number, history: readonly GameRecord[], roster: readonly Character[] = CHARACTERS): { character: Character; color: Side } {
  const near = nearestOpponents(targetRating(rating, history), roster);
  const autoGames = history.filter((g) => g.auto).length;
  let faction: string = MAIN_FACTIONS[autoGames % MAIN_FACTIONS.length];
  if ((autoGames + 1) % MATCHMAKING.weaknessEvery === 0) {
    const scores = factionScores(history);
    const played = MAIN_FACTIONS.filter((f) => scores[f] !== null);
    if (played.length) faction = played.reduce((w, f) => (scores[f]! < scores[w]! ? f : w), played[0]);
  }
  // The wanted faction among the three nearest opponents, else simply the nearest.
  const character = near.find((c) => c.faction === faction) ?? near[0];
  const last = history[history.length - 1];
  const color: Side = last ? (last.color === 'white' ? 'black' : 'white') : 'white';
  return { character, color };
}
