// Ranks: the hero's class title grows with the best rating reached, like the level titles of a tabletop RPG.
// A Squire becomes a Cavalier at 1000 and a Knight at 1200; the last step is just above the Necromancer King.
import type { HeroClass } from './gear';

/** The ratings where a new rank begins (0: the class's own name). */
export const RANK_STEPS = [0, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2150] as const;

export const RANKS: Record<HeroClass['id'], string[]> = {
  squire: ['Squire', 'Man-at-Arms', 'Cavalier', 'Knight', 'Knight-Captain', 'Paladin', 'Knight Commander', 'Champion of the Realm', 'Kingsguard Eternal'],
  apprentice: ['Apprentice', 'Initiate', 'Conjurer', 'Arcanist', 'Battlemage', 'Mage', 'Archmage', 'Grand Magus', 'Arch-Sorcerer of the Throne'],
  ranger: ['Wanderer', 'Tracker', 'Strider', 'Pathfinder', 'Warden', 'Sentinel', 'Ranger-Lord', 'Shadow of the Wilds', 'Warden of the Last Road'],
  bard: ['Busker', 'Minstrel', 'Balladeer', 'Troubadour', 'Skald', 'Loremaster', 'Master Poet', 'Voice of Legends', 'Bard of the Endless Song'],
};

/** The rank for a best-ever rating: its name, and the next one (null at the top). */
export function rankOf(cls: HeroClass['id'], peak: number): { name: string; next: { name: string; at: number } | null } {
  let i = 0;
  while (i + 1 < RANK_STEPS.length && peak >= RANK_STEPS[i + 1]) i++;
  const names = RANKS[cls];
  return { name: names[i], next: i + 1 < RANK_STEPS.length ? { name: names[i + 1], at: RANK_STEPS[i + 1] } : null };
}

/** The rank that begins at `at`, for a class. */
export const rankAt = (cls: HeroClass['id'], at: number) => RANKS[cls][Math.max(0, RANK_STEPS.indexOf(at as (typeof RANK_STEPS)[number]))];
