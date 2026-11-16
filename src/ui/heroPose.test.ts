import { describe, expect, it } from 'vitest';
import { ITEMS } from '../data/gear';
import { itemAngle, posedItemPoint, posedPoint, WRISTS, type AdventurePose, type Point } from './heroPose';

describe('adventurous hero pose', () => {
  const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  it('attaches every held item to the same posed wrist as its sleeve and hand', () => {
    for (const item of ITEMS) {
      if (item.art.slot !== 'main' && item.art.slot !== 'off') continue;
      const hand = item.art.slot;
      const pose: AdventurePose = { [hand]: item.art.kind };
      expect(posedItemPoint(WRISTS[hand], pose, hand), item.id).toEqual(posedPoint(WRISTS[hand], pose));
      // Rigid item transforms must preserve length: swords and lutes must not bend with the arm.
      const a: Point = [32, 24], b: Point = [52, 174];
      expect(distance(posedItemPoint(a, pose, hand), posedItemPoint(b, pose, hand))).toBeCloseTo(distance(a, b), 8);
    }
  });

  it('widens the stance and raises the holding arm without moving equipment independently', () => {
    const pose: AdventurePose = { main: 'sword', off: 'shield' };
    const left = posedPoint([84, 230], pose), right = posedPoint([108, 230], pose);
    expect(right[0] - left[0]).toBeGreaterThan(24);
    expect(posedPoint(WRISTS.main, pose)[1]).toBeLessThan(WRISTS.main[1]);
    expect(posedPoint(WRISTS.off, pose)[1]).toBeLessThan(WRISTS.off[1]);
    expect(itemAngle(pose, 'main')).toBeLessThan(0);
    expect(itemAngle({ main: 'lute' }, 'main')).toBeGreaterThan(0);
  });

  it('keeps the face/head registration independent of the weapon and body choice', () => {
    const head: Point = [96, 72], neck: Point = [96, 120];
    const plain = { main: 'sword' as const };
    for (const item of ITEMS) {
      const pose: AdventurePose = item.art.slot === 'main' ? { main: item.art.kind } : { off: 'shield' };
      expect(posedPoint(head, pose)).toEqual(posedPoint(head, plain));
      expect(posedPoint(neck, pose)).toEqual(posedPoint(neck, plain));
    }
  });

  it('reserves canvas space above tall tilted hats', () => {
    for (const x of [32, 96, 160]) expect(posedPoint([x, 0], { main: 'sword' })[1]).toBeGreaterThan(2);
  });
});
