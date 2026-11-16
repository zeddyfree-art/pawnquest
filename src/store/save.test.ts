import { beforeEach, describe, expect, it } from 'vitest';
import { characterById } from '../data/characters';
import { newHero, SKINS, EYES } from '../data/gear';
import { exportSave, parseSave, useSave } from './save';

describe('save', () => {
  beforeEach(() => useSave.getState().resetAll());

  it('a win updates rating, peak, XP, history and crowns', () => {
    const s = useSave.getState();
    s.startGame('pip', 'white', true);
    useSave.getState().updateActive({ moves: ['e2e4'] });
    useSave.getState().finishGame({ winner: 'white', termination: 'resign' });
    const after = useSave.getState();
    // K=40 while being placed: a win against an opponent rated r gives 40 × (1 − expected score).
    const expected = 600 + Math.round(40 * (1 - 1 / (1 + 10 ** ((characterById('pip')!.rating - 600) / 400))));
    expect(after.rating).toBe(expected);
    expect(after.peak).toBe(expected);
    expect(after.history).toHaveLength(1);
    expect(after.active).toBeNull();
    expect(after.lastResult).toMatchObject({ crownEarned: true, xpGained: 80 });
  });

  it('exports and imports a save file, and rejects anything else', () => {
    useSave.getState().startGame('moss', 'black', false);
    useSave.getState().finishGame({ winner: null, termination: 'agreement' });
    const file = exportSave();
    useSave.getState().resetAll();
    useSave.getState().importSave(file);
    expect(useSave.getState().history).toHaveLength(1);
    expect(() => parseSave('{"hello":1}')).toThrow('not a Pawnquest save file');
    expect(() => parseSave('nope')).toThrow();
  });

  it('round-trips both body choices and legacy looks without losing equipment or progress', () => {
    const hero = newHero('Ada', 'bard', { skin: SKINS[2], hair: '#5a3a22', hairStyle: 'long', eyes: EYES[0] });
    hero.equip.off = 'wooden-shield';
    useSave.getState().setHero(hero);
    for (const body of [undefined, 'male', 'female'] as const) {
      useSave.getState().setHero({ ...hero, look: { ...hero.look, ...(body ? { body } : {}) } });
      const saved = parseSave(exportSave());
      expect(saved.hero?.look.body).toBe(body);
      expect(saved.hero?.equip).toEqual(hero.equip);
      expect(saved.rating).toBe(useSave.getState().rating);
      expect(saved.xp).toBe(useSave.getState().xp);
      expect(saved.history).toEqual(useSave.getState().history);
    }
  });

  it('logs puzzles: XP once per solved puzzle, quests from first tries', () => {
    const solveOne = (id: string, firstTry: boolean) => useSave.getState().logPuzzle(id, true, firstTry);
    expect(solveOne('a', true)).toEqual([]);
    expect(useSave.getState().xp).toBe(5);
    solveOne('a', true); // again: no more XP
    expect(useSave.getState().xp).toBe(5);
    for (const id of ['b', 'c', 'd']) solveOne(id, true);
    expect(solveOne('e', true)).toContain('second-chance');
    expect(useSave.getState().logPuzzle('f', false, false)).toEqual([]);
    expect(useSave.getState().puzzleLog.f).toMatchObject({ solved: false });
  });
});
