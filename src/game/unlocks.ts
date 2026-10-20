// Everything the player can unlock, derived from the game history alone (so an imported save, or a game played
// on another version, unlocks the same things): gear from first wins, and quests that give boards, piece sets
// and pets.
import { characterById } from '../data/characters';
import { ITEMS, type Item } from '../data/gear';
import type { BoardThemeId } from '../ui/boards';
import type { PetKind } from '../ui/hero';
import type { PieceSetId } from '../ui/pieces';
import { crownFor, type GameRecord } from './progress';

export type Reward = { kind: 'board'; id: BoardThemeId } | { kind: 'pieces'; id: PieceSetId } | { kind: 'pet'; id: PetKind };

export interface Progress {
  /** Rated games only, oldest first. */
  history: readonly GameRecord[];
  /** How many games have a saved review. */
  reviews: number;
  peak: number;
}

export interface Quest {
  id: string;
  title: string;
  text: string;
  reward: Reward;
  /** [done so far, needed]. */
  progress(p: Progress): [number, number];
}

const wins = (h: readonly GameRecord[]) => h.filter((g) => g.score === 1);
/** The player's own moves in a game. */
const ownMoves = (g: GameRecord) => g.moves.filter((_, i) => (i % 2 === 0) === (g.color === 'white'));
const ownMoveCount = (g: GameRecord) => ownMoves(g).length;
const distinctWinsOf = (h: readonly GameRecord[], faction: string) => new Set(wins(h).filter((g) => g.faction === faction).map((g) => g.characterId)).size;
const count = (n: number, of: number): [number, number] => [Math.min(n, of), of];

export const QUESTS: Quest[] = [
  { id: 'first-game', title: 'First steps', text: 'Play your first game.', reward: { kind: 'pet', id: 'chick' }, progress: (p) => count(p.history.length, 1) },
  { id: 'first-win', title: 'First victory', text: 'Win a game.', reward: { kind: 'board', id: 'wood' }, progress: (p) => count(wins(p.history).length, 1) },
  { id: 'draw', title: 'Peacemaker', text: 'Draw a game.', reward: { kind: 'pet', id: 'cat' }, progress: (p) => count(p.history.filter((g) => g.score === 0.5).length, 1) },
  { id: 'reviews', title: 'Learn from it', text: 'Review 3 of your games.', reward: { kind: 'pet', id: 'owl' }, progress: (p) => count(p.reviews, 3) },
  { id: 'mates', title: 'Checkmate!', text: 'Win 3 games by checkmate.', reward: { kind: 'pieces', id: 'woodland' }, progress: (p) => count(wins(p.history).filter((g) => g.termination === 'checkmate').length, 3) },
  { id: 'black-wins', title: 'Dark horse', text: 'Win 3 games with Black.', reward: { kind: 'board', id: 'cobble' }, progress: (p) => count(wins(p.history).filter((g) => g.color === 'black').length, 3) },
  { id: 'quick-win', title: 'Swift strike', text: 'Win in 25 moves or fewer.', reward: { kind: 'pet', id: 'frog' }, progress: (p) => count(wins(p.history).filter((g) => ownMoveCount(g) <= 25).length, 1) },
  { id: 'promote', title: 'From pawn to queen', text: 'Promote a pawn and win the game.', reward: { kind: 'pet', id: 'slime' }, progress: (p) => count(wins(p.history).filter((g) => ownMoves(g).some((m) => m.length === 5)).length, 1) },
  { id: 'gambiteers', title: 'Fire walker', text: 'Beat 3 different Gambiteers.', reward: { kind: 'pet', id: 'fox' }, progress: (p) => count(distinctWinsOf(p.history, 'gambiteer'), 3) },
  { id: 'classicists', title: 'Steel breaker', text: 'Beat 3 different Classicists.', reward: { kind: 'board', id: 'stone' }, progress: (p) => count(distinctWinsOf(p.history, 'classicist'), 3) },
  { id: 'strategists', title: 'Stone mover', text: 'Beat 3 different Strategists.', reward: { kind: 'board', id: 'forest' }, progress: (p) => count(distinctWinsOf(p.history, 'strategist'), 3) },
  { id: 'wins-10', title: 'Seasoned', text: 'Win 10 games.', reward: { kind: 'pieces', id: 'ivory' }, progress: (p) => count(wins(p.history).length, 10) },
  { id: 'wins-25', title: 'Veteran', text: 'Win 25 games.', reward: { kind: 'pieces', id: 'royal' }, progress: (p) => count(wins(p.history).length, 25) },
  { id: 'long-win', title: 'Endgame grinder', text: 'Win a game of 60 moves or more.', reward: { kind: 'pieces', id: 'frost' }, progress: (p) => count(wins(p.history).filter((g) => ownMoveCount(g) >= 60).length, 1) },
  { id: 'rating-800', title: 'On the road', text: 'Reach a rating of 800.', reward: { kind: 'pet', id: 'dog' }, progress: (p) => count(p.peak >= 800 ? 1 : 0, 1) },
  { id: 'gold-crown', title: 'Golden', text: 'Earn a gold crown (5 wins against one opponent).', reward: { kind: 'pieces', id: 'ember' }, progress: (p) => count(goldCrowns(p.history), 1) },
  { id: 'rating-1200', title: 'Village hero', text: 'Reach a rating of 1200.', reward: { kind: 'pieces', id: 'jade' }, progress: (p) => count(p.peak >= 1200 ? 1 : 0, 1) },
  { id: 'rating-1600', title: 'Knight of the realm', text: 'Reach a rating of 1600.', reward: { kind: 'board', id: 'marble' }, progress: (p) => count(p.peak >= 1600 ? 1 : 0, 1) },
  { id: 'rating-2000', title: 'Dragon friend', text: 'Reach a rating of 2000.', reward: { kind: 'pet', id: 'dragon' }, progress: (p) => count(p.peak >= 2000 ? 1 : 0, 1) },
  { id: 'underworld', title: 'Into the dark', text: 'Beat anyone in the Underworld.', reward: { kind: 'board', id: 'obsidian' }, progress: (p) => count(wins(p.history).filter((g) => characterById(g.characterId)?.world === 'underworld').length, 1) },
  { id: 'boss', title: 'The crown falls', text: 'Beat the Necromancer King.', reward: { kind: 'pet', id: 'ghost' }, progress: (p) => count(wins(p.history).filter((g) => g.characterId === 'necromancer-king').length, 1) },
  { id: 'all-rivals', title: 'Legend', text: 'Beat every opponent at least once.', reward: { kind: 'pet', id: 'bat' }, progress: (p) => count(new Set(wins(p.history).map((g) => g.characterId)).size, 32) },
];

function goldCrowns(h: readonly GameRecord[]): number {
  const byChar = new Map<string, number>();
  for (const g of wins(h)) byChar.set(g.characterId, (byChar.get(g.characterId) ?? 0) + 1);
  return [...byChar.values()].filter((n) => crownFor(n) === 'gold').length;
}

export const questDone = (q: Quest, p: Progress) => {
  const [n, of] = q.progress(p);
  return n >= of;
};

export interface Unlocks {
  items: Set<string>;
  boards: Set<BoardThemeId>;
  pieces: Set<PieceSetId>;
  pets: Set<PetKind>;
  quests: Set<string>;
}

export function unlocks(p: Progress): Unlocks {
  const beaten = new Set(wins(p.history).map((g) => g.characterId));
  const u: Unlocks = {
    items: new Set(ITEMS.filter((i) => !i.from || beaten.has(i.from)).map((i) => i.id)),
    boards: new Set<BoardThemeId>(['meadow']),
    pieces: new Set<PieceSetId>(['classic']),
    pets: new Set<PetKind>(),
    quests: new Set<string>(),
  };
  for (const q of QUESTS) {
    if (!questDone(q, p)) continue;
    u.quests.add(q.id);
    if (q.reward.kind === 'board') u.boards.add(q.reward.id);
    else if (q.reward.kind === 'pieces') u.pieces.add(q.reward.id);
    else u.pets.add(q.reward.id);
  }
  return u;
}

/** What a finished game unlocked: new gear and newly completed quests. */
export function newUnlocks(before: Progress, after: Progress): { items: Item[]; quests: Quest[] } {
  const a = unlocks(before);
  const b = unlocks(after);
  return { items: ITEMS.filter((i) => b.items.has(i.id) && !a.items.has(i.id)), quests: QUESTS.filter((q) => b.quests.has(q.id) && !a.quests.has(q.id)) };
}
