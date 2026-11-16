import { describe, expect, it } from 'vitest';
import { EYES, ITEMS, SKINS, newHero, outfitOf } from '../data/gear';
import { renderHero } from './hero';
import { bodyWidthAt, HERO_ANCHORS } from './heroRig';

describe('shared hero equipment rig', () => {
  const look = { skin: SKINS[2], hair: '#5a3a22', hairStyle: 'messy' as const, eyes: EYES[0] };

  it('keeps head, neck, both hands and feet registered for either fit', () => {
    for (const body of ['male', 'female'] as const) {
      for (const anchor of ['head', 'neck', 'mainHand', 'offHand', 'feet'] as const) {
        expect(bodyWidthAt(body, HERO_ANCHORS[anchor][1]), `${body} ${anchor}`).toBe(1);
      }
    }
    expect(bodyWidthAt('female', 35)).toBeLessThan(bodyWidthAt('male', 35));
    expect(bodyWidthAt('female', 48)).toBeLessThan(bodyWidthAt('male', 48));
  });

  it('keeps all item IDs and the equipped object when changing body', () => {
    const hero = newHero('Ada', 'bard', look);
    for (const item of ITEMS) {
      hero.equip[item.art.slot] = item.id;
      const changed = { ...hero, look: { ...hero.look, body: 'female' as const } };
      expect(changed.equip).toBe(hero.equip);
      expect(outfitOf(changed)[item.art.slot]).toBe(item.art);
    }
  });

  it('defaults legacy looks to the male fit and also fits the code fallback', () => {
    const outfit = outfitOf(newHero('Hero', 'squire', look));
    const legacy = renderHero(look, outfit);
    expect(renderHero({ ...look, body: 'male' }, outfit)).toEqual(legacy);
    const female = renderHero({ ...look, body: 'female' }, outfit);
    expect(female).not.toEqual(legacy);
    const width = 48 * 2;
    expect(female.slice(0, 31 * 2 * width)).toEqual(legacy.slice(0, 31 * 2 * width));
    expect(female.slice(42 * 2 * width, 45 * 2 * width)).toEqual(legacy.slice(42 * 2 * width, 45 * 2 * width));
  });
});
