import { describe, expect, it } from 'vitest';
import { heroHairTop } from './heroLayers';
import { renderHero } from './hero';
import { ITEMS, newHero, outfitOf } from '../data/gear';

describe('player hair under headgear', () => {
  const look = { skin: '#efc29a', hair: '#d4ad55', hairStyle: 'spiky' as const, eyes: '#2b2238' };
  it('hides the top of high hairstyles under every closed cap in the code fallback', () => {
    for (const kind of ['strawhat', 'bandana', 'witchhat', 'jester', 'tricorn', 'beanie'] as const) {
      const top = heroHairTop(kind);
      expect(top, kind).toBeGreaterThan(0);
      expect(top, kind).toBeLessThan(116);
      const item = ITEMS.find(i => i.art.slot === 'head' && i.art.kind === kind)!;
      const hero = newHero('Hair', 'squire', look); hero.equip.head = item.id;
      const spiky = renderHero(look, outfitOf(hero), { hairTop: top });
      const bald = renderHero({ ...look, hairStyle: 'none' }, outfitOf(hero), { hairTop: top });
      expect(spiky.slice(0, Math.floor(top / 2) * 96), item.id).toEqual(bald.slice(0, Math.floor(top / 2) * 96));
    }
  });
  it('keeps crowns and feathers open and hides all hair under helmets and hoods', () => {
    for (const kind of ['crown', 'leafcrown', 'feather'] as const) expect(heroHairTop(kind)).toBe(0);
    for (const kind of ['helmet', 'hood'] as const) {
      expect(heroHairTop(kind)).toBe(Infinity);
      const item = ITEMS.find(i => i.art.slot === 'head' && i.art.kind === kind)!;
      const hero = newHero('Hair', 'squire', look); hero.equip.head = item.id;
      const outfit = outfitOf(hero);
      expect(renderHero(look, outfit, { hairTop: Infinity })).toEqual(renderHero({ ...look, hairStyle: 'none' }, outfit, { hairTop: Infinity }));
    }
  });
});
