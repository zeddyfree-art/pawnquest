import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../data/characters';
import { CLASSES, ITEMS, PETS, itemFrom } from '../data/gear';
import { BOARD_THEMES } from '../ui/boards';
import { PIECE_SETS } from '../ui/pieces';
import type { GameRecord } from './progress';
import { QUESTS, newUnlocks, unlocks, type Progress } from './unlocks';
import { TITLES } from '../data/titles';

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
    const rewards = QUESTS.flatMap((q) => q.rewards.map((r) => `${r.kind}:${r.id}`));
    expect(new Set(rewards).size).toBe(rewards.length);
    for (const b of BOARD_THEMES) if (b.id !== 'meadow') expect(rewards, b.id).toContain(`board:${b.id}`);
    for (const p of PIECE_SETS) if (p.id !== 'classic') expect(rewards, p.id).toContain(`pieces:${p.id}`);
    for (const p of PETS) expect(rewards, p.id).toContain(`pet:${p.id}`);
  });
  it('a new save owns only the starting gear, the meadow board and the classic pieces', () => {
    const u = unlocks(progress([]));
    expect([...u.items].sort()).toEqual(ITEMS.filter((i) => !i.from && !i.quest).map((i) => i.id).sort());
    expect(u.titles.size).toBe(0);
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
  it('every quest reward exists, and every quest item is earned by a quest', () => {
    for (const q of QUESTS) for (const r of q.rewards) {
      if (r.kind === 'item') expect(ITEMS.some((i) => i.id === r.id), r.id).toBe(true);
      if (r.kind === 'title') expect(TITLES[r.id], r.id).toBeDefined();
    }
    for (const i of ITEMS.filter((x) => x.quest)) expect(QUESTS.some((q) => q.rewards.some((r) => r.kind === 'item' && r.id === i.id)), i.id).toBe(true);
  });
  it('games played count losses too, but not games resigned before move 10', () => {
    const lost = (n: number) => Array.from({ length: n }, () => game({ score: 0, winner: 'black', termination: 'resign', moves: Array.from({ length: 24 }, () => 'e2e4') }));
    expect(unlocks(progress(lost(5))).titles.has('wanderer')).toBe(true);
    const quick = Array.from({ length: 5 }, () => game({ score: 0, winner: 'black', termination: 'resign', moves: ['e2e4', 'e7e5'] }));
    expect(unlocks(progress(quick)).titles.has('wanderer')).toBe(false);
  });
  it('habits: a clean reviewed loss, a comeback, mating with king and rook, exploring first moves, a breather', () => {
    const long = Array.from({ length: 40 }, () => 'e2e4');
    const clean = game({ score: 0, winner: 'black', termination: 'resign', moves: long, review: { accuracy: 80, blunders: 0, mistakes: 1, inaccuracies: 2, kinds: [], minWinPct: 30 } });
    expect(unlocks(progress([clean])).titles.has('careful')).toBe(true);
    const comeback = game({ score: 0.5, winner: null, termination: 'repetition', moves: long, review: { accuracy: 70, blunders: 1, mistakes: 0, inaccuracies: 0, kinds: [], minWinPct: 12 } });
    expect(unlocks(progress([comeback])).items.has('phoenix-feather')).toBe(true);
    // A real king-and-rook mate: White Kg6 Ra1, Black Kg8 → Ra8#.
    const rookMate = game({ startFen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', moves: ['a1a8'] });
    expect(unlocks(progress([rookMate])).titles.has('mate-maker')).toBe(true);
    const opens = ['e2e4', 'd2d4', 'c2c4'].flatMap((m) => [1, 2, 3].map(() => game({ moves: [m, ...long.slice(0, 20)] })));
    expect(unlocks(progress(opens)).items.has('compass')).toBe(true);
    const t = (min: number) => new Date(Date.UTC(2026, 9, 20, 10, min)).toISOString();
    const losses = [0, 1, 2].map((i) => game({ score: 0, winner: 'black', termination: 'resign', moves: long, date: t(i * 20 + 15) }));
    expect(unlocks(progress([...losses, game({ startedAt: t(60) })])).items.has('cozy-beanie')).toBe(false); // 5 minutes later
    expect(unlocks(progress([...losses, game({ startedAt: t(80) })])).items.has('cozy-beanie')).toBe(true);
  });
  it('a habit breaker needs the mistake to become twice as rare', () => {
    const r = (kinds: string[]) => game({ moves: Array.from({ length: 30 }, () => 'e2e4'), review: { accuracy: 70, blunders: 1, mistakes: 0, inaccuracies: 0, kinds, minWinPct: 40 } });
    const before = [...Array(6)].map(() => r(['Hanging piece'])).concat([...Array(4)].map(() => r([])));
    const after = [...Array(2)].map(() => r(['Hanging piece'])).concat([...Array(8)].map(() => r([])));
    expect(unlocks(progress([...before, ...after])).titles.has('guardian-pieces')).toBe(true);
    expect(unlocks(progress([...before, ...before])).titles.has('guardian-pieces')).toBe(false);
  });
});

describe('pets grow', () => {
  it('an accessory at 25 games with the pet, grown up at 100; other pets and short games do not count', async () => {
    const { petStage, nextGrowth } = await import('./pets');
    const g = (pet: string | null, own = 20) => game({ pet, termination: 'resign', moves: Array.from({ length: own * 2 }, () => 'e2e4') });
    expect(petStage([], 'dog')).toBe(0);
    expect(petStage(Array.from({ length: 24 }, () => g('dog')), 'dog')).toBe(0);
    expect(petStage([...Array.from({ length: 24 }, () => g('dog')), g('cat')], 'dog')).toBe(0);
    expect(petStage([...Array.from({ length: 24 }, () => g('dog')), g('dog', 3)], 'dog')).toBe(0); // resigned at move 3
    expect(petStage(Array.from({ length: 25 }, () => g('dog')), 'dog')).toBe(1);
    expect(nextGrowth(Array.from({ length: 30 }, () => g('dog')), 'dog')).toEqual({ games: 30, of: 100 });
    expect(petStage(Array.from({ length: 100 }, () => g('dog')), 'dog')).toBe(2);
    expect(nextGrowth(Array.from({ length: 100 }, () => g('dog')), 'dog')).toBeNull();
  });
});
