import { beforeEach, describe, expect, it } from 'vitest';
import { exportSave, parseSave, useSave } from './save';

describe('save', () => {
  beforeEach(() => useSave.getState().resetAll());

  it('a win updates rating, peak, XP, history and crowns', () => {
    const s = useSave.getState();
    s.startGame('pip', 'white', true);
    useSave.getState().updateActive({ moves: ['e2e4'] });
    useSave.getState().finishGame({ winner: 'white', termination: 'resign' });
    const after = useSave.getState();
    expect(after.rating).toBe(620); // K=40, equal ratings
    expect(after.peak).toBe(620);
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
});
