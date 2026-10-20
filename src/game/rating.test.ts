import { describe, expect, it } from 'vitest';
import { expectedScore, ratingDelta, skulls, stakes } from './rating';

describe('rating', () => {
  it('matches the table in the brief (K=24 after placement, K=40 while placing)', () => {
    const p = 1000;
    expect(stakes(p, p + 400, 30)).toMatchObject({ win: 22, loss: -2 });
    expect(stakes(p, p + 200, 30)).toMatchObject({ win: 18, loss: -6 });
    expect(stakes(p, p, 30)).toMatchObject({ win: 12, loss: -12, draw: 0 });
    expect(stakes(p, p - 200, 30)).toMatchObject({ win: 6, loss: -18 });
    expect(stakes(p, p + 400, 0)).toMatchObject({ win: 36, loss: -4 });
    expect(stakes(p, p, 5)).toMatchObject({ win: 20, loss: -20 });
    expect(stakes(p, p - 200, 19)).toMatchObject({ win: 10, loss: -30 });
  });
  it('never drops below the 400 floor', () => {
    expect(ratingDelta(410, 400, 0, 0)).toBe(-10);
    expect(ratingDelta(400, 600, 0, 0)).toBe(0);
  });
  it('expected score is symmetric', () => {
    expect(expectedScore(800, 1000) + expectedScore(1000, 800)).toBeCloseTo(1);
    expect(expectedScore(1400, 1600)).toBeCloseTo(0.24, 2);
  });
  it('skulls grow with the gap above you', () => {
    expect([skulls(600, 600), skulls(600, 800), skulls(600, 1000), skulls(600, 1400)]).toEqual([0, 1, 2, 3]);
  });
});
