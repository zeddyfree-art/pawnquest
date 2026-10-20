import { describe, expect, it } from 'vitest';
import { applyTemperature, applyTopP, sampleMove } from './sampling';

const moves = [
  { uci: 'a', p: 0.6 },
  { uci: 'b', p: 0.3 },
  { uci: 'c', p: 0.1 },
];

describe('sampling', () => {
  it('temperature 1 keeps the distribution, 0 is argmax, higher flattens', () => {
    expect(applyTemperature(moves, 1).map((m) => m.p)).toEqual([0.6, 0.3, 0.1].map((x) => expect.closeTo(x, 6)));
    expect(applyTemperature(moves, 0).map((m) => m.p)).toEqual([1, 0, 0]);
    const hot = applyTemperature(moves, 2);
    expect(hot[0].p).toBeLessThan(0.6);
    expect(hot[2].p).toBeGreaterThan(0.1);
  });
  it('top-p keeps the smallest head reaching p', () => {
    expect(applyTopP(moves, 0.85).map((m) => m.uci)).toEqual(['a', 'b']);
    expect(applyTopP(moves, 0.5).map((m) => m.uci)).toEqual(['a']);
    expect(applyTopP(moves, 1).length).toBe(3);
  });
  it('only picks legal moves and respects the probability floor', () => {
    for (const r of [0, 0.3, 0.7, 0.99]) {
      const got = sampleMove(moves, ['b', 'c'], { temperature: 1, topP: 1, minProbability: 0.2, rand: () => r });
      expect(got).toEqual({ uci: 'b', random: false });
    }
  });
  it('a blunder roll plays a random legal move', () => {
    const seq = [0.01, 0.99];
    const got = sampleMove(moves, ['a', 'b', 'c'], { temperature: 1, topP: 1, blunderChance: 0.1, rand: () => seq.shift()! });
    expect(got).toEqual({ uci: 'c', random: true });
  });
});
