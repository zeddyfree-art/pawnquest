// How each character looks: the parts of their portrait (see ui/portraits.ts). Faction colours show in the
// backdrop and clothing: fire for the Gambiteers, steel blue for the Classicists, moss green for the Strategists.
import type { Look } from '../ui/portraits';

const SKIN = { pale: '#f6dccb', light: '#f6d3b3', fair: '#efc29a', tan: '#d99a6c', brown: '#b06f45', dark: '#7a4a2f', undead: '#a9bba8', demon: '#c4473a', frost: '#a9d4ec', bone: '#ece4cf', burlap: '#d8b77a' };
const BACK = { gambiteer: '#f0a07a', classicist: '#8fc3e8', strategist: '#a5d48f', neutral: '#e8d79a', boss: '#b48ac8' };

const look = (o: Partial<Look> & Pick<Look, 'skin' | 'backdrop'>): Look => ({
  hair: '#5a3a22',
  hairStyle: 'short',
  headwear: 'none',
  beard: 'none',
  clothing: 'tunic',
  cloth: '#8a6a4f',
  cloth2: '#5d4a3a',
  accessories: [],
  face: 'normal',
  ...o,
});

export const LOOKS: Record<string, Look> = {
  'straw-sam': look({ skin: SKIN.burlap, face: 'buttons', hair: '#e8c25a', hairStyle: 'wild', headwear: 'strawhat', hat: '#d4a944', clothing: 'burlap', cloth: '#9a6a3f', cloth2: '#d0443a', accessories: ['stitches'], backdrop: BACK.neutral }),

  pip: look({ skin: SKIN.fair, hair: '#c46a2c', hairStyle: 'messy', headwear: 'bandana', hat: '#c4553f', clothing: 'rags', cloth: '#7d5a3c', cloth2: '#c4553f', accessories: ['freckles'], backdrop: BACK.gambiteer }),
  'old-tom': look({ skin: SKIN.tan, hair: '#d8d4cc', hairStyle: 'short', beard: 'longbeard', headwear: 'hood', hat: '#7a6650', clothing: 'rags', cloth: '#8f7a5c', cloth2: '#6b8f4e', backdrop: BACK.classicist }),
  moss: look({ skin: SKIN.light, hair: '#a8b39a', hairStyle: 'long', beard: 'longbeard', clothing: 'robe', cloth: '#6b8f4e', cloth2: '#4e6b34', backdrop: BACK.strategist }),

  'brawling-bess': look({ skin: SKIN.tan, hair: '#e0612f', hairStyle: 'ponytail', clothing: 'tunic', cloth: '#b2563d', cloth2: '#7d4f2c', accessories: ['scar', 'freckles'], backdrop: BACK.gambiteer }),
  hobb: look({ skin: SKIN.fair, hair: '#e8c25a', hairStyle: 'messy', headwear: 'strawhat', hat: '#e3c46a', clothing: 'apron', cloth: '#f4ead6', cloth2: '#4f7bb0', accessories: ['freckles'], backdrop: BACK.classicist }),
  nell: look({ skin: SKIN.light, hair: '#5a3a22', hairStyle: 'bun', headwear: 'cap', hat: '#6b4a2f', clothing: 'coat', cloth: '#8a6a4f', cloth2: '#5e7a46', backdrop: BACK.strategist }),

  zed: look({ skin: SKIN.brown, hair: '#ffcf4a', hairStyle: 'spiky', clothing: 'tunic', cloth: '#e0612f', cloth2: '#f2b33d', accessories: ['earring', 'warpaint'], backdrop: BACK.gambiteer }),
  'squire-aldric': look({ skin: SKIN.fair, hair: '#c99a5a', hairStyle: 'short', clothing: 'tunic', cloth: '#4f7bb0', cloth2: '#c0cbdc', accessories: ['blush'], backdrop: BACK.classicist }),
  grunwald: look({ skin: SKIN.tan, hair: '#efe6d6', hairStyle: 'short', beard: 'mustache', headwear: 'cap', hat: '#f4ead6', clothing: 'apron', cloth: '#c9a37a', cloth2: '#f4ead6', backdrop: BACK.strategist }),

  morwen: look({ skin: SKIN.light, hair: '#3b5a3a', hairStyle: 'long', headwear: 'witchhat', hat: '#4a3260', clothing: 'robe', cloth: '#5b3a6e', cloth2: '#e0612f', accessories: ['blush'], backdrop: BACK.gambiteer }),
  bram: look({ skin: SKIN.brown, hair: '#2b1a12', hairStyle: 'short', beard: 'beard', clothing: 'apron', cloth: '#c4553f', cloth2: '#7a4a2f', accessories: ['scar'], backdrop: BACK.classicist }),
  'captain-holt': look({ skin: SKIN.fair, hair: '#6b4a2f', beard: 'mustache', headwear: 'helmet', hat: '#9aa3b2', clothing: 'armor', cloth: '#9aa3b2', cloth2: '#63c74d', backdrop: BACK.strategist }),

  jester: look({ skin: SKIN.light, hairStyle: 'none', headwear: 'jester', hat: '#d0443a', clothing: 'jester', cloth: '#d0443a', cloth2: '#f2b33d', accessories: ['blush'], backdrop: BACK.gambiteer }),
  'sir-cedric': look({ skin: SKIN.fair, hair: '#e8c25a', headwear: 'helmet', hat: '#c0cbdc', clothing: 'armor', cloth: '#c0cbdc', cloth2: '#0099db', backdrop: BACK.classicist }),
  'bishop-anselm': look({ skin: SKIN.light, hair: '#d8d4cc', headwear: 'mitre', hat: '#f4ead6', clothing: 'vestments', cloth: '#f4ead6', cloth2: '#5e9b45', accessories: ['glasses'], backdrop: BACK.strategist }),

  vex: look({ skin: SKIN.light, hair: '#2b2238', headwear: 'hood', hat: '#3a2a3e', clothing: 'cloak', cloth: '#3a2a3e', cloth2: '#8b2a3e', accessories: ['mask', 'scar'], eyes: '#d0443a', backdrop: BACK.gambiteer }),
  'royal-champion': look({ skin: SKIN.tan, hair: '#5a3a22', beard: 'stubble', headwear: 'circlet', clothing: 'armor', cloth: '#e3c46a', cloth2: '#0099db', backdrop: BACK.classicist }),
  spymaster: look({ skin: SKIN.light, hair: '#2b2238', beard: 'mustache', headwear: 'tophat', hat: '#2b2238', clothing: 'coat', cloth: '#3e4a3a', cloth2: '#2b3a2b', accessories: ['monocle'], backdrop: BACK.strategist }),

  scarlet: look({ skin: SKIN.tan, hair: '#c4302b', hairStyle: 'long', headwear: 'tricorn', hat: '#3b2617', clothing: 'coat', cloth: '#c4302b', cloth2: '#3b2617', accessories: ['eyepatch', 'earring'], backdrop: BACK.gambiteer }),
  thorne: look({ skin: SKIN.fair, hair: '#6b4a2f', hairStyle: 'messy', beard: 'stubble', headwear: 'hood', hat: '#3f6e7a', clothing: 'cloak', cloth: '#3f6e7a', cloth2: '#6b4a2f', backdrop: BACK.classicist }),
  oakhart: look({ skin: SKIN.tan, hair: '#ece4cf', hairStyle: 'long', beard: 'longbeard', headwear: 'leafcrown', clothing: 'robe', cloth: '#6b8f4e', cloth2: '#8a5a3b', backdrop: BACK.strategist }),

  ignis: look({ skin: SKIN.brown, hair: '#e0612f', hairStyle: 'wild', headwear: 'hornhelm', hat: '#8a3b2a', clothing: 'fur', cloth: '#8a3b2a', cloth2: '#f2b33d', accessories: ['warpaint'], backdrop: BACK.gambiteer }),
  solenne: look({ skin: SKIN.light, hair: '#f4ead6', hairStyle: 'long', headwear: 'wizardhat', hat: '#2f5ea8', clothing: 'robe', cloth: '#2f5ea8', cloth2: '#f2b33d', accessories: ['glow'], eyes: '#2f5ea8', backdrop: BACK.classicist }),
  'frost-giant': look({ skin: SKIN.frost, hair: '#ffffff', hairStyle: 'wild', beard: 'longbeard', headwear: 'hornhelm', hat: '#7a8aa0', clothing: 'fur', cloth: '#7a8aa0', cloth2: '#ffffff', eyes: '#2f5ea8', backdrop: BACK.strategist }),

  azgar: look({ skin: SKIN.demon, hair: '#2b1a12', headwear: 'hornhelm', hat: '#3b2617', cloth2: '#ece4cf', clothing: 'armor', cloth: '#3b2617', accessories: ['fangs'], eyes: '#f2b33d', backdrop: BACK.gambiteer }),
  'count-draven': look({ skin: SKIN.pale, hair: '#2b2238', clothing: 'collar', cloth: '#2b2238', cloth2: '#8b2a3e', accessories: ['fangs'], eyes: '#d0443a', backdrop: BACK.classicist }),
  'bone-oracle': look({ skin: SKIN.bone, face: 'skull', hairStyle: 'none', headwear: 'hood', hat: '#3e5a3a', clothing: 'robe', cloth: '#3e5a3a', cloth2: '#2b3a2b', accessories: ['glow'], eyes: '#7df0c8', backdrop: BACK.strategist }),

  'witch-queen': look({ skin: SKIN.light, hair: '#e0612f', hairStyle: 'long', headwear: 'crown', clothing: 'robe', cloth: '#8b2a3e', cloth2: '#f2b33d', accessories: ['glow'], eyes: '#f2b33d', backdrop: BACK.gambiteer }),
  'death-knight': look({ skin: SKIN.undead, hairStyle: 'none', headwear: 'helmet', hat: '#3a3a4a', clothing: 'armor', cloth: '#3a3a4a', cloth2: '#8b2a3e', eyes: '#7df0c8', backdrop: BACK.classicist }),
  lich: look({ skin: SKIN.bone, face: 'skull', hairStyle: 'none', headwear: 'crown', clothing: 'robe', cloth: '#3e2a4f', cloth2: '#5e9b45', accessories: ['glow'], eyes: '#7df0c8', backdrop: BACK.strategist }),

  'necromancer-king': look({ skin: SKIN.undead, hair: '#2b2238', hairStyle: 'long', beard: 'longbeard', headwear: 'crown', clothing: 'collar', cloth: '#3e2a4f', cloth2: '#f2b33d', accessories: ['glow'], eyes: '#7df0c8', backdrop: BACK.boss }),
};
