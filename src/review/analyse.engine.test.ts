import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { reviewGame } from './analyse';
import { explain } from './explain';
import { NodeEngine } from './nodeEngine';
import { legalUcis, posFromFen } from '../game/chess';

let engine: NodeEngine;
beforeAll(async () => {
  engine = new NodeEngine();
  await engine.ready();
});
afterAll(() => engine.quit());

/** A stand-in for Maia: everyone plays the first legal move. */
const firstMove = async (fens: string[]) => legalUcis(posFromFen(fens[fens.length - 1])).map((uci, i) => ({ uci, p: i === 0 ? 1 : 0 }));

describe('review with real Stockfish', () => {
  it('finds and explains the blunder in the fool’s mate', async () => {
    const r = await reviewGame({ moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4'], playerSide: 'white', playerRating: 600, opponentRating: 600 }, engine, firstMove);
    expect(r.labels[2]).toBe('blunder');
    expect(r.labels[3]).toBe('best');
    expect(r.moments.map((m) => m.ply)).toContain(2);
    const m = r.moments.find((x) => x.ply === 2)!;
    expect(explain(m).theme).toBe('Allowed mate');
    expect(m.maia?.rating).toBe(600);
    expect(r.accuracy.white!).toBeLessThan(r.accuracy.black!);
  }, 60_000);
});
