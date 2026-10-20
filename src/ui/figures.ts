// The opponents as full figures for the map, drawn by the hero's renderer: their look comes from their portrait
// (skin, hair, beard, headwear, clothing, face) and in their hands they hold the trophy they drop.
import type { Character } from '../data/characters';
import { itemFrom } from '../data/gear';
import { LOOKS } from '../data/looks';
import type { BodyKind, FaceKind, HeadKind, HeroHair, HeroLook, Outfit } from './hero';
import type { Accessory, Clothing, Headwear } from './portraits';

const HEAD: Partial<Record<Headwear, HeadKind>> = {
  hood: 'hood', cowl: 'hood', cap: 'cap', bandana: 'bandana', helmet: 'helmet', crown: 'crown', witchhat: 'witchhat', tricorn: 'tricorn',
  mitre: 'mitre', hornhelm: 'hornhelm', circlet: 'circlet', jester: 'jester', strawhat: 'strawhat', leafcrown: 'leafcrown', wizardhat: 'wizardhat', tophat: 'tophat',
};
const BODY: Record<Clothing, BodyKind> = {
  tunic: 'tunic', rags: 'rags', robe: 'robe', armor: 'armor', apron: 'apron', cloak: 'cloak', collar: 'cloak', fur: 'fur',
  jester: 'jester', vestments: 'robe', coat: 'coat', burlap: 'burlap',
};
const FACE: Partial<Record<Accessory, FaceKind>> = { eyepatch: 'eyepatch', glasses: 'glasses', monocle: 'monocle', mask: 'mask', fangs: 'fangs', warpaint: 'warpaint' };

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + f))));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('')}`;
}

export function figureOf(c: Character): { look: HeroLook; outfit: Outfit } | null {
  const l = LOOKS[c.id];
  if (!l) return null;
  const look: HeroLook = {
    skin: l.skin,
    hair: l.hair,
    hairStyle: (l.hairStyle === 'wild' ? 'curly' : l.hairStyle) as HeroHair,
    eyes: l.eyes ?? (l.face === 'skull' ? '#7df0c8' : '#2b2238'),
    beard: l.beard,
    face: l.face,
  };
  const outfit: Outfit = {};
  const head = HEAD[l.headwear];
  if (head) outfit.head = { slot: 'head', kind: head, color: l.hat ?? l.cloth, color2: l.cloth2 };
  const face = l.accessories.map((a) => FACE[a]).find(Boolean);
  if (face) outfit.face = { slot: 'face', kind: face, color: face === 'mask' ? '#3a2a3e' : face === 'eyepatch' ? '#2b1a12' : face === 'fangs' ? '#ffffff' : '#6b4a2f' };
  outfit.body = { slot: 'body', kind: BODY[l.clothing], color: l.cloth, color2: l.cloth2 };
  outfit.legs = l.clothing === 'armor' ? { slot: 'legs', kind: 'greaves', color: l.cloth } : { slot: 'legs', kind: 'trousers', color: shade(l.cloth, -0.35), color2: '#4a3220' };
  // What they drop, in their hands.
  const trophy = itemFrom(c.id)?.art;
  if (trophy?.slot === 'main') outfit.main = trophy;
  if (trophy?.slot === 'off') outfit.off = trophy;
  return { look, outfit };
}
