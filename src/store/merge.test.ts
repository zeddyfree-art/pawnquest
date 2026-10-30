import { describe, expect, it } from 'vitest';
import { RATING, XP } from '../config';
import type { GameRecord } from '../game/progress';
import { mergeSaves, type SyncedSave } from './merge';
import { NEW_SAVE } from './save';

const game = (id: string, date: string, score: number, extra: Partial<GameRecord> = {}): GameRecord => ({
  id,
  characterId: 'pip',
  faction: 'neutral' as GameRecord['faction'],
  opponentRating: 600,
  color: 'white',
  moves: ['e2e4', 'e7e5'],
  winner: score === 1 ? 'white' : score === 0 ? 'black' : null,
  termination: 'resign',
  score,
  ratingBefore: 0,
  ratingAfter: 0,
  date: `2026-10-${date}T12:00:00.000Z`,
  auto: false,
  ...extra,
});

const save = (history: GameRecord[], patch: Partial<SyncedSave> = {}): SyncedSave => {
  const { active: _a, settings: _s, ...rest } = NEW_SAVE;
  return { ...rest, history, rating: history.at(-1)?.ratingAfter ?? RATING.start, ...patch };
};

describe('mergeSaves', () => {
  it('takes the games of both devices, in order, and replays the rating over them', () => {
    const phone = save([game('a', '02', 1), game('c', '03', 1)], { xp: 60 });
    const laptop = save([game('b', '01', 0)], { xp: 5 });
    const m = mergeSaves(phone, laptop);
    expect(m.history.map((g) => g.id)).toEqual(['b', 'a', 'c']);
    for (let i = 1; i < m.history.length; i++) expect(m.history[i].ratingBefore).toBe(m.history[i - 1].ratingAfter);
    expect(m.history[0].ratingBefore).toBe(RATING.start);
    expect(m.rating).toBe(m.history[2].ratingAfter);
    // The phone's XP plus the laptop's loss.
    expect(m.xp).toBe(60 + XP.loss);
  });

  it('is stable: merging the result again changes nothing', () => {
    const m = mergeSaves(save([game('a', '01', 1)], { xp: 30 }), save([game('b', '02', 0.5)], { xp: 15 }));
    const again = mergeSaves(m, m);
    expect(again.history).toEqual(m.history);
    expect(again.xp).toBe(m.xp);
    expect(again.rating).toBe(m.rating);
  });

  it('keeps everything when nothing is new', () => {
    const s = save([game('a', '01', 1, { ratingAfter: 640 })], { xp: 30, rating: 640, peak: 640 });
    expect(mergeSaves(s, s)).toEqual(s);
  });

  it('a newer start replaces the other side', () => {
    const old = save([game('a', '01', 1)], { xp: 30 });
    const fresh = save([], { epoch: '2026-10-30T00:00:00.000Z' });
    expect(mergeSaves(old, fresh).history).toEqual([]);
    expect(mergeSaves(fresh, old).history).toEqual([]);
  });

  it('a new device takes the hero of the one that has played', () => {
    const hero = (name: string) => ({ name }) as SyncedSave['hero'];
    const played = save([game('a', '01', 1)], { hero: hero('Zed'), heroAt: '2026-10-01' });
    const fresh = save([], { hero: hero('New'), heroAt: '2026-10-30' });
    expect(mergeSaves(fresh, played).hero?.name).toBe('Zed');
    expect(mergeSaves(played, fresh).hero?.name).toBe('Zed');
  });

  it('adds puzzles and solved puzzles from both', () => {
    const a = save([], { puzzleLog: { p1: { solved: true, firstTry: false, date: '1' } }, xp: XP.puzzle });
    const b = save([], { puzzleLog: { p2: { solved: true, firstTry: true, date: '2' } }, xp: XP.puzzle });
    const m = mergeSaves(a, b);
    expect(Object.keys(m.puzzleLog).sort()).toEqual(['p1', 'p2']);
    expect(m.xp).toBe(2 * XP.puzzle);
  });
});
