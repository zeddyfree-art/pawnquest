// Pets grow with you: every game played with a pet along counts for that pet. At 25 games it gets an accessory,
// at 100 it grows up. Only games that count as played (see countsAsGame) count, and nothing is ever lost.
import { OWL_STUDY, PET_GROWTH } from '../config';
import type { PetStage, Scholar } from '../ui/hero';
import { countsAsGame, type GameRecord } from './progress';

export const gamesWithPet = (history: readonly GameRecord[], pet: string | null | undefined) => (pet ? history.filter((g) => g.pet === pet && countsAsGame(g)).length : 0);

export function petStage(history: readonly GameRecord[], pet: string | null | undefined): PetStage {
  const n = gamesWithPet(history, pet);
  return n >= PET_GROWTH.grown ? 2 : n >= PET_GROWTH.accessory ? 1 : 0;
}

/** Professor Hoot learns with you: glasses after 10 reviewed games, a graduation cap after 50. */
export function owlScholar(history: readonly GameRecord[]): Scholar {
  const n = history.filter((g) => g.review).length;
  return n >= OWL_STUDY.cap ? 2 : n >= OWL_STUDY.glasses ? 1 : 0;
}

/** Games still to go to the next stage (null when fully grown). */
export function nextGrowth(history: readonly GameRecord[], pet: string | null | undefined): { games: number; of: number } | null {
  const n = gamesWithPet(history, pet);
  if (n >= PET_GROWTH.grown) return null;
  return { games: n, of: n >= PET_GROWTH.accessory ? PET_GROWTH.grown : PET_GROWTH.accessory };
}
