import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../data/characters';
import { CLASSES, ITEMS, PETS, itemFrom } from '../data/gear';
import { BOARD_THEMES } from '../ui/boards';
import { PIECE_SETS } from '../ui/pieces';
import type { GameRecord } from './progress';
import { QUESTS, newUnlocks, unlocks, type Progress } from './unlocks';

const game = (o: Partial<GameRecord>): GameRecord => ({
  id: Math.random().toString(36),
  characterId: 'pip',
  faction: 'gambiteer',
  opponentRating: 600,
  color: 'white',
  moves: ['e2e4', 'e7e5'],
  winner: 'white',
  termination: 'checkmate',
  score: 1,
  ratingBefore: 600,
  ratingAfter: 610,
  date: '2026-10-20T10:00:00Z',
  auto: false,
  ...o,
});
const progress = (history: GameRecord[], extra: Partial<Progress> = {}): Progress => ({ history, reviews: 0, peak: 600, ...extra });

describe('unlocks', () => {
  it('every opponent drops exactly one item, and ids are unique', () => {
    for (const c of CHARACTERS) expect(ITEMS.filter((i) => i.from === c.id), c.id).toHaveLength(1);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const cls of CLASSES) for (const [slot, id] of Object.entries(cls.start)) expect(ITEMS.find((i) => i.id === id)?.art.slot).toBe(slot);
  });
  it('every board, piece set and pet can be earned (or is there from the start)', () => {
    const rewards = QUESTS.map((q) => `${q.reward.kind}:${q.reward.id}`);
    expect(new Set(rewards).size).toBe(rewards.length);
    for (const b of BOARD_THEMES) if (b.id !== 'meadow') expect(rewards, b.id).toContain(`board:${b.id}`);
    for (const p of PIECE_SETS) if (p.id !== 'classic') expect(rewards, p.id).toContain(`pieces:${p.id}`);
    for (const p of PETS) expect(rewards, p.id).toContain(`pet:${p.id}`);
  });
  it('a new save owns only the starting gear, the meadow board and the classic pieces', () => {
    const u = unlocks(progress([]));
    expect([...u.items].sort()).toEqual(ITEMS.filter((i) => !i.from).map((i) => i.id).sort());
    expect([...u.boards]).toEqual(['meadow']);
    expect([...u.pieces]).toEqual(['classic']);
    expect(u.pets.size).toBe(0);
  });
  it('a first win drops the opponent’s item and completes the right quests', () => {
    const fresh = newUnlocks(progress([]), progress([game({})]));
    expect(fresh.items.map((i) => i.id)).toEqual([itemFrom('pip')!.id]);
    expect(fresh.quests.map((q) => q.id).sort()).toEqual(['first-game', 'first-win', 'quick-win']);
    // A second win against the same opponent drops nothing new.
    expect(newUnlocks(progress([game({})]), progress([game({}), game({})])).items).toEqual([]);
  });
  it('losses unlock no gear; quests count only what they ask for', () => {
    const loss = game({ winner: 'black', score: 0, termination: 'resign' });
    expect(unlocks(progress([loss])).items.has(itemFrom('pip')!.id)).toBe(false);
    const byBlack = [1, 2, 3].map(() => game({ color: 'black', winner: 'black', moves: ['e2e4', 'e7e5', 'g1f3'] }));
    expect(unlocks(progress(byBlack)).boards.has('cobble')).toBe(true);
    const promo = game({ moves: ['e2e4', 'd7d5', 'a7a8q'] }); // the third ply is White's: a promotion
    expect(unlocks(progress([promo])).pets.has('slime')).toBe(true);
    expect(unlocks(progress([], { peak: 1250 })).pieces.has('jade')).toBe(true);
    expect(unlocks(progress([], { reviews: 3 })).pets.has('owl')).toBe(true);
  });
});
