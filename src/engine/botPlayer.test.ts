import { describe, expect, it } from 'vitest';
import { CHARACTERS, characterById } from '../data/characters';
import { OPENINGS } from '../data/openings';
import { legalUcis, posFromFen, replay } from '../game/chess';
import { allLines, bookMoves } from './book';
import { acceptsDraw, chooseBotMove, shouldResign, thinkTimeMs, type Predict } from './botPlayer';

/** A stand-in for Maia: uniform over the legal moves. */
const uniform: Predict = async ({ fens }) => {
  const legal = legalUcis(posFromFen(fens[fens.length - 1]));
  return { moves: legal.map((uci) => ({ uci, p: 1 / legal.length })), winChance: 0.5 };
};

describe('opening books', () => {
  it('every book line is legal', () => {
    expect(allLines().length).toBeGreaterThan(80);
  });
  it('every character uses openings that exist', () => {
    for (const c of CHARACTERS) for (const id of [...c.book.white, ...c.book.vsE4, ...c.book.vsD4]) expect(OPENINGS[id], `${c.id}: ${id}`).toBeDefined();
  });
  it('factions open with their own first moves as White', () => {
    const first = (id: string) => [...bookMoves(characterById(id)!, 'white', []).keys()];
    expect(first('pip')).toEqual(['e2e4']);
    expect(first('moss')).toEqual(['d2d4']);
    expect(first('spymaster')).toEqual(['c2c4']);
    expect(first('oakhart')).toEqual(['g1f3']);
  });
  it('Pip reaches the Halloween Gambit knight sacrifice inside his book depth', () => {
    const pip = characterById('pip')!;
    expect([...bookMoves(pip, 'white', ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'b1c3', 'g8f6']).keys()]).toEqual(['f3e5']);
  });
  it('leaves the book when the opponent deviates or the depth is reached', () => {
    const moss = characterById('moss')!; // book depth 2
    expect(bookMoves(moss, 'white', ['d2d4', 'h7h6']).size).toBe(0);
    expect(bookMoves(moss, 'white', ['d2d4', 'd7d5', 'c1f4', 'g8f6']).size).toBe(0);
    expect(bookMoves(moss, 'black', ['e2e4']).has('c7c6')).toBe(true);
  });
});

describe('bot moves', () => {
  it('plays from its book first, then legal Maia moves', async () => {
    const sir = characterById('sir-cedric')!;
    const m1 = await chooseBotMove(sir, [], 1400, uniform, () => 0.5);
    expect(m1).toMatchObject({ uci: 'e2e4', source: 'book' });
    const off = ['e2e4', 'a7a6'];
    const m2 = await chooseBotMove(sir, off, 1400, uniform, () => 0.5);
    expect(m2?.source).toBe('maia');
    expect(legalUcis(replay(off).pos)).toContain(m2!.uci);
  });
  it('think time stays inside the range and a small share of the clock', () => {
    const lich = characterById('lich')!;
    for (const r of [0.01, 0.5, 0.99]) {
      const t = thinkTimeMs(lich, 15 * 60_000, 30, () => r);
      expect(t).toBeGreaterThanOrEqual(5000);
      expect(t).toBeLessThanOrEqual(14000);
    }
    expect(thinkTimeMs(lich, 20_000, 30, () => 0.5)).toBe(1000);
  });
  it('resigns only from 1000 up, after several hopeless moves', () => {
    expect(shouldResign(characterById('pip')!, [0.01, 0.01, 0.01, 0.01])).toBe(false);
    expect(shouldResign(characterById('zed')!, [0.01, 0.01, 0.01])).toBe(false);
    expect(shouldResign(characterById('zed')!, [0.5, 0.01, 0.01, 0.01, 0.01])).toBe(true);
  });
  it('accepts a draw only in an equal-or-worse endgame', () => {
    expect(acceptsDraw(posFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), 0.4)).toBe(false);
    const endgame = posFromFen('8/5k2/8/3r4/8/8/3R1K2/8 w - - 0 1');
    expect(acceptsDraw(endgame, 0.5)).toBe(true);
    expect(acceptsDraw(endgame, 0.8)).toBe(false);
  });
});
