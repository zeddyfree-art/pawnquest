// The hero's wardrobe: four classes (each with a starting outfit), one piece of gear from every opponent (won the
// first time you beat them), pets from quests, and the looks to choose from when you make your hero.
import type { GearArt, HeroHair, HeroLook, Outfit, PetKind, Slot } from '../ui/hero';

export interface Item {
  id: string;
  name: string;
  art: GearArt;
  /** The opponent who drops it at your first win. Items with neither `from` nor `quest` are starting gear. */
  from?: string;
  /** Earned with a quest (see game/unlocks.ts). */
  quest?: true;
}

export interface HeroClass {
  id: 'squire' | 'apprentice' | 'ranger' | 'bard';
  name: string;
  blurb: string;
  /** Starting gear, by slot. */
  start: Partial<Record<Slot, string>>;
}

export const ITEMS: Item[] = [
  // Starting gear.
  { id: 'squire-tunic', name: 'Squire’s Tunic', art: { slot: 'body', kind: 'tunic', color: '#4f7bb0', color2: '#6b4a2f' } },
  { id: 'brown-trousers', name: 'Brown Trousers', art: { slot: 'legs', kind: 'trousers', color: '#7a5a3c', color2: '#4a3220' } },
  { id: 'wooden-sword', name: 'Wooden Sword', art: { slot: 'main', kind: 'woodsword', color: '#c9925a', color2: '#7a4f2c' } },
  { id: 'apprentice-robe', name: 'Apprentice Robe', art: { slot: 'body', kind: 'robe', color: '#6b4a9a', color2: '#4a3270' } },
  { id: 'grey-trousers', name: 'Grey Trousers', art: { slot: 'legs', kind: 'trousers', color: '#6a6a78', color2: '#3b2f3a' } },
  { id: 'oak-wand', name: 'Oak Wand', art: { slot: 'main', kind: 'wand', color: '#8a5a3b', color2: '#7de0f0' } },
  { id: 'ranger-tunic', name: 'Ranger’s Tunic', art: { slot: 'body', kind: 'tunic', color: '#5e8a45', color2: '#6b4a2f' } },
  { id: 'green-trousers', name: 'Leaf-green Trousers', art: { slot: 'legs', kind: 'trousers', color: '#4a6a3a', color2: '#6b4a2f' } },
  { id: 'short-bow', name: 'Short Bow', art: { slot: 'main', kind: 'bow', color: '#a8743f' } },
  { id: 'bard-vest', name: 'Bard’s Vest', art: { slot: 'body', kind: 'vest', color: '#c4453f', color2: '#6b4a2f' } },
  { id: 'striped-trousers', name: 'Plum Trousers', art: { slot: 'legs', kind: 'trousers', color: '#7a4a6a', color2: '#4a3220' } },
  { id: 'lute', name: 'Old Lute', art: { slot: 'main', kind: 'lute', color: '#c9925a' } },

  // One from each opponent.
  { id: 'straw-hat', name: 'Straw Hat', from: 'straw-sam', art: { slot: 'head', kind: 'strawhat', color: '#e3c46a', color2: '#d0443a' } },
  { id: 'red-bandana', name: 'Red Bandana', from: 'pip', art: { slot: 'head', kind: 'bandana', color: '#c4453f' } },
  { id: 'patched-trousers', name: 'Patched Trousers', from: 'old-tom', art: { slot: 'legs', kind: 'patched', color: '#8f7a5c', color2: '#5a4630' } },
  { id: 'hermit-staff', name: 'Hermit’s Staff', from: 'moss', art: { slot: 'main', kind: 'staff', color: '#8a5a3b', color2: '#6cc04a' } },
  { id: 'brawler-club', name: 'Brawler’s Club', from: 'brawling-bess', art: { slot: 'main', kind: 'club', color: '#9a6a3f' } },
  { id: 'work-trousers', name: 'Work Trousers', from: 'hobb', art: { slot: 'legs', kind: 'trousers', color: '#4f7bb0', color2: '#6b4a2f' } },
  { id: 'rat-lantern', name: 'Rat-catcher’s Lantern', from: 'nell', art: { slot: 'off', kind: 'lantern', color: '#c9a04a', color2: '#ffe27a' } },
  { id: 'fire-torch', name: 'Juggler’s Torch', from: 'zed', art: { slot: 'main', kind: 'torch', color: '#f07a2a', color2: '#ffe27a' } },
  { id: 'wooden-shield', name: 'Wooden Shield', from: 'squire-aldric', art: { slot: 'off', kind: 'shield', color: '#b07a4a', color2: '#4f7bb0' } },
  { id: 'miller-apron', name: 'Miller’s Apron', from: 'grunwald', art: { slot: 'body', kind: 'apron', color: '#f4ead6', color2: '#c9a37a' } },
  { id: 'witch-hat', name: 'Witch’s Hat', from: 'morwen', art: { slot: 'head', kind: 'witchhat', color: '#4a3260', color2: '#e0612f' } },
  { id: 'smith-hammer', name: 'Smith’s Hammer', from: 'bram', art: { slot: 'main', kind: 'hammer', color: '#8a94a4' } },
  { id: 'guard-helmet', name: 'Guard Helmet', from: 'captain-holt', art: { slot: 'head', kind: 'helmet', color: '#aab3c2', color2: '#63a74d' } },
  { id: 'jester-cap', name: 'Jester’s Cap', from: 'jester', art: { slot: 'head', kind: 'jester', color: '#d0443a', color2: '#f2b33d' } },
  { id: 'knight-sword', name: 'Knight’s Sword', from: 'sir-cedric', art: { slot: 'main', kind: 'sword', color: '#dfe6ee', color2: '#f2b33d' } },
  { id: 'reading-glasses', name: 'Reading Glasses', from: 'bishop-anselm', art: { slot: 'face', kind: 'glasses', color: '#6b4a2f' } },
  { id: 'shadow-mask', name: 'Shadow Mask', from: 'vex', art: { slot: 'face', kind: 'mask', color: '#3a2a3e' } },
  { id: 'champion-armour', name: 'Champion’s Armour', from: 'royal-champion', art: { slot: 'body', kind: 'armor', color: '#e3c46a', color2: '#0099db' } },
  { id: 'monocle', name: 'Spymaster’s Monocle', from: 'spymaster', art: { slot: 'face', kind: 'monocle', color: '#f2b33d' } },
  { id: 'pirate-tricorn', name: 'Pirate Tricorn', from: 'scarlet', art: { slot: 'head', kind: 'tricorn', color: '#3b2617', color2: '#f2b33d' } },
  { id: 'ranger-cloak', name: 'Ranger’s Cloak', from: 'thorne', art: { slot: 'body', kind: 'cloak', color: '#3f6e7a', color2: '#6b4a2f' } },
  { id: 'leaf-crown', name: 'Crown of Leaves', from: 'oakhart', art: { slot: 'head', kind: 'leafcrown', color: '#6cb04a', color2: '#e86a8a' } },
  { id: 'dragon-egg', name: 'Dragon Egg', from: 'ignis', art: { slot: 'off', kind: 'egg', color: '#e8743a', color2: '#ffd04a' } },
  { id: 'archmage-robe', name: 'Archmage Robe', from: 'solenne', art: { slot: 'body', kind: 'robe', color: '#3b5ab0', color2: '#f2b33d' } },
  { id: 'giant-fur', name: 'Frost Giant’s Fur', from: 'frost-giant', art: { slot: 'body', kind: 'fur', color: '#7aa8c8', color2: '#f4f4f4' } },
  { id: 'demon-greaves', name: 'Demon Greaves', from: 'azgar', art: { slot: 'legs', kind: 'greaves', color: '#8a2a2a' } },
  { id: 'vampire-fangs', name: 'Vampire Fangs', from: 'count-draven', art: { slot: 'face', kind: 'fangs', color: '#ffffff' } },
  { id: 'seer-orb', name: 'Seer’s Orb', from: 'bone-oracle', art: { slot: 'off', kind: 'orb', color: '#9a7ae8' } },
  { id: 'hellfire-staff', name: 'Hellfire Staff', from: 'witch-queen', art: { slot: 'main', kind: 'firestaff', color: '#3b2238', color2: '#f04a2a' } },
  { id: 'black-plate', name: 'Death Knight’s Plate', from: 'death-knight', art: { slot: 'body', kind: 'plate', color: '#4a4a5a', color2: '#7a1a2a' } },
  { id: 'phylactery', name: 'Phylactery', from: 'lich', art: { slot: 'off', kind: 'phylactery', color: '#7df0c8', color2: '#8a7f6a' } },
  // Earned with quests: good habits, games played, reviews.
  { id: 'hourglass', name: 'Hourglass', quest: true, art: { slot: 'off', kind: 'hourglass', color: '#e3c46a' } },
  { id: 'scholar-quill', name: 'Scholar’s Quill', quest: true, art: { slot: 'main', kind: 'quill', color: '#f4f0e6' } },
  { id: 'phoenix-feather', name: 'Phoenix Feather', quest: true, art: { slot: 'head', kind: 'feather', color: '#f07a2a', color2: '#7a4a2a' } },
  { id: 'cozy-beanie', name: 'Cozy Beanie', quest: true, art: { slot: 'head', kind: 'beanie', color: '#5a8ae0', color2: '#f4ead6' } },
  { id: 'compass', name: 'Compass', quest: true, art: { slot: 'off', kind: 'compass', color: '#c9a04a' } },
  { id: 'travellers-cloak', name: 'Traveller’s Cloak', quest: true, art: { slot: 'body', kind: 'cloak', color: '#7a5a3c', color2: '#a8743f' } },
  { id: 'golden-pawn', name: 'Golden Pawn', quest: true, art: { slot: 'off', kind: 'pawn', color: '#f2b33d' } },
  { id: 'heros-mantle', name: 'Hero’s Mantle', quest: true, art: { slot: 'body', kind: 'cloak', color: '#b03040', color2: '#f2b33d' } },
  { id: 'candle', name: 'Candle', quest: true, art: { slot: 'off', kind: 'candle', color: '#f4ead6' } },
  { id: 'scholars-hood', name: 'Scholar’s Hood', quest: true, art: { slot: 'head', kind: 'hood', color: '#2f4a7a' } },
  { id: 'grandmasters-tome', name: 'Grandmaster’s Tome', quest: true, art: { slot: 'off', kind: 'book', color: '#5b3a6e', color2: '#f2b33d' } },

  { id: 'bone-crown', name: 'The Necromancer’s Crown', from: 'necromancer-king', art: { slot: 'head', kind: 'crown', color: '#ece4cf', color2: '#7df0c8' } },
];

export const itemById = (id: string | null | undefined) => (id ? ITEMS.find((i) => i.id === id) : undefined);
export const itemFrom = (characterId: string) => ITEMS.find((i) => i.from === characterId);

export const CLASSES: HeroClass[] = [
  { id: 'squire', name: 'Squire', blurb: 'Steady and brave. Dreams of a real sword.', start: { body: 'squire-tunic', legs: 'brown-trousers', main: 'wooden-sword' } },
  { id: 'apprentice', name: 'Apprentice', blurb: 'Reads every book twice. Sees three moves ahead.', start: { body: 'apprentice-robe', legs: 'grey-trousers', main: 'oak-wand' } },
  { id: 'ranger', name: 'Ranger', blurb: 'Patient as the forest. Strikes from afar.', start: { body: 'ranger-tunic', legs: 'green-trousers', main: 'short-bow' } },
  { id: 'bard', name: 'Bard', blurb: 'Plays for the crowd. Loves a wild gambit.', start: { body: 'bard-vest', legs: 'striped-trousers', main: 'lute' } },
];
export const classById = (id: string) => CLASSES.find((c) => c.id === id) ?? CLASSES[0];

export interface Pet {
  id: PetKind;
  name: string;
}
export const PETS: Pet[] = [
  { id: 'chick', name: 'Pip-squeak the Chick' },
  { id: 'cat', name: 'Marmalade the Cat' },
  { id: 'dog', name: 'Biscuit the Dog' },
  { id: 'frog', name: 'Sir Hops the Frog' },
  { id: 'owl', name: 'Professor Hoot' },
  { id: 'fox', name: 'Ember the Fox' },
  { id: 'slime', name: 'Blub the Slime' },
  { id: 'bat', name: 'Nibbles the Bat' },
  { id: 'ghost', name: 'Boo' },
  { id: 'dragon', name: 'Little Ignis' },
];
export const petById = (id: string | null | undefined) => PETS.find((p) => p.id === id);

/** Looks to pick from when making a hero. Some hair styles and colours unlock at higher levels. */
export const SKINS = ['#f6dccb', '#f6d3b3', '#efc29a', '#d99a6c', '#b06f45', '#7a4a2f'];
export const EYES = ['#2b2238', '#4a6ab0', '#3b7a4a', '#7a4a2a'];
export const HAIR_COLORS: { color: string; level: number }[] = [
  { color: '#2b1a12', level: 1 },
  { color: '#5a3a22', level: 1 },
  { color: '#a8642c', level: 1 },
  { color: '#e8c25a', level: 1 },
  { color: '#c4453f', level: 1 },
  { color: '#d8d4cc', level: 3 },
  { color: '#e88ab0', level: 5 },
  { color: '#5a8ae0', level: 7 },
  { color: '#6cc04a', level: 9 },
];
export const HAIR_STYLES: { id: HeroHair; level: number }[] = [
  { id: 'short', level: 1 },
  { id: 'messy', level: 1 },
  { id: 'long', level: 1 },
  { id: 'ponytail', level: 1 },
  { id: 'bob', level: 1 },
  { id: 'none', level: 1 },
  { id: 'bun', level: 2 },
  { id: 'braids', level: 4 },
  { id: 'curly', level: 6 },
  { id: 'spiky', level: 8 },
];

export interface Hero {
  name: string;
  cls: HeroClass['id'];
  look: HeroLook;
  /** Equipped item id per slot (null = nothing). */
  equip: Partial<Record<Slot, string | null>>;
  pet: PetKind | null;
  /** A title earned with a quest (data/titles.ts), shown under the name. */
  title?: string | null;
}

export function newHero(name: string, cls: HeroClass['id'], look: HeroLook): Hero {
  return { name: name.trim() || 'Hero', cls, look, equip: { ...classById(cls).start }, pet: null };
}

/** The drawing instructions for what the hero wears. */
export function outfitOf(hero: Hero): Outfit {
  const o: Record<string, GearArt> = {};
  for (const [slot, id] of Object.entries(hero.equip)) {
    const it = itemById(id);
    if (it && it.art.slot === slot) o[slot] = it.art;
  }
  return o as Outfit;
}

export const SLOT_LABEL: Record<Slot, string> = { head: 'Head', face: 'Face', body: 'Body', legs: 'Legs', main: 'Main hand', off: 'Off hand' };
