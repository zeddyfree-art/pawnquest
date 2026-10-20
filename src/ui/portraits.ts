// Portraits drawn in code: a 40×40 bust built from parts (hair, headwear, clothing, facial hair, accessories),
// each a smooth shape filled with its colour and given its own darker outline and a light rim, so every character
// shares one style. Four moods change the eyes, brows and mouth. The same parts will dress the player's character.

export type Mood = 'idle' | 'thinking' | 'smug' | 'defeated';

export type Hair = 'none' | 'short' | 'messy' | 'long' | 'ponytail' | 'bun' | 'spiky' | 'curly' | 'braids' | 'wild';
export type Headwear =
  | 'none'
  | 'hood'
  | 'cap'
  | 'bandana'
  | 'helmet'
  | 'crown'
  | 'witchhat'
  | 'tricorn'
  | 'mitre'
  | 'hornhelm'
  | 'circlet'
  | 'jester'
  | 'strawhat'
  | 'cowl'
  | 'leafcrown'
  | 'wizardhat'
  | 'tophat';
export type Beard = 'none' | 'stubble' | 'mustache' | 'beard' | 'longbeard';
export type Clothing = 'tunic' | 'rags' | 'robe' | 'armor' | 'apron' | 'cloak' | 'collar' | 'fur' | 'jester' | 'vestments' | 'coat' | 'burlap';
export type Accessory = 'eyepatch' | 'scar' | 'glasses' | 'monocle' | 'earring' | 'freckles' | 'blush' | 'fangs' | 'mask' | 'warpaint' | 'stitches' | 'glow';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: Hair;
  headwear: Headwear;
  /** Main colour of the headwear (defaults to the clothing colour). */
  hat?: string;
  beard: Beard;
  clothing: Clothing;
  cloth: string;
  /** Second clothing colour (trim, pattern, armour plate). */
  cloth2: string;
  accessories: Accessory[];
  eyes?: string;
  /** Skull or button eyes instead of a face. */
  face?: 'normal' | 'skull' | 'buttons';
  /** Backdrop colour behind the bust. */
  backdrop: string;
}

import { Canvas as PixelCanvas, any, ellipse, lineOf, minus, mirrorAround, only, pixelsToUrl, polygon, rect, tone, type Pt } from './pixel';

const N = 40;
class Canvas extends PixelCanvas {
  constructor() {
    super(N);
  }
}
const mirror = (pts: Pt[]): Pt[] => mirrorAround(20, pts);

// ---------- the parts ----------
const HEAD = ellipse(20, 16.6, 8.2, 9.2);
const EARS = any(ellipse(11.8, 17.5, 1.9, 2.4), ellipse(28.2, 17.5, 1.9, 2.4));
const NECK = rect(16.5, 23, 23.5, 29);
const SHOULDERS = polygon(mirror([[3, 40], [4.5, 33], [9, 29.5], [14.5, 27.5]]));

function drawBackHair(cv: Canvas, l: Look) {
  const c = l.hair;
  switch (l.hairStyle) {
    case 'long':
      cv.part(any(ellipse(20, 15, 10.5, 10), rect(9.5, 15, 30.5, 34)), c);
      break;
    case 'braids':
      cv.part(any(ellipse(20, 15, 10, 9.5), ellipse(10.5, 28, 2.4, 6.5), ellipse(29.5, 28, 2.4, 6.5)), c, {
        pattern: (x, y) => ((x < 14 || x > 26) && y > 22 && y % 3 === 0 ? tone(c, -0.25) : null),
      });
      break;
    case 'ponytail':
      cv.part(any(ellipse(20, 15, 10, 9.5), ellipse(29.5, 22, 3, 7)), c);
      break;
    case 'curly':
    case 'wild':
      cv.part(any(...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ellipse(20 + Math.cos(i * 0.8) * 9, 14 + Math.sin(i * 0.8) * 8.5, 4.2, 4.2))), c);
      break;
    case 'bun':
      cv.part(ellipse(20, 5.4, 4.2, 3.6), c);
      break;
    default:
      break;
  }
  if (l.headwear === 'hood' || l.headwear === 'cowl') cv.part(any(ellipse(20, 15, 12, 12.5), rect(8, 15, 32, 31)), l.hat ?? l.cloth);
}

function drawClothing(cv: Canvas, l: Look) {
  const c = l.cloth;
  const c2 = l.cloth2;
  const vneck = polygon([[16.5, 27.5], [23.5, 27.5], [20, 33]]);
  switch (l.clothing) {
    case 'tunic':
      cv.part(SHOULDERS, c);
      cv.part(vneck, l.skin);
      cv.part(rect(19.5, 33, 20.5, 40), tone(c, -0.25), { outline: false, rim: false });
      break;
    case 'rags':
      cv.part(SHOULDERS, c, { pattern: (x, y) => ((x * 7 + y * 3) % 23 === 0 ? tone(c, -0.3) : x > 26 && x < 32 && y > 33 && y < 38 ? c2 : null) });
      cv.part(vneck, l.skin);
      break;
    case 'robe':
      cv.part(SHOULDERS, c);
      cv.part(polygon([[15, 27.5], [25, 27.5], [21.5, 40], [18.5, 40]]), c2);
      break;
    case 'armor':
      cv.part(SHOULDERS, c);
      cv.part(any(ellipse(8.5, 32.5, 5, 4), ellipse(31.5, 32.5, 5, 4)), tone(c, 0.12)); // pauldrons
      cv.part(polygon([[15, 28], [25, 28], [23.5, 40], [16.5, 40]]), c2); // tabard in the faction colour
      cv.dot(9, 31, '#ffffff');
      cv.dot(30, 31, '#ffffff');
      break;
    case 'apron':
      cv.part(SHOULDERS, c);
      cv.part(vneck, l.skin);
      cv.part(rect(13.5, 31, 26.5, 40), c2);
      cv.part(any(rect(13.5, 28, 15, 31), rect(25, 28, 26.5, 31)), tone(c2, -0.2), { rim: false });
      break;
    case 'cloak':
      cv.part(SHOULDERS, c);
      cv.part(polygon([[16, 27.5], [24, 27.5], [22, 40], [18, 40]]), c2);
      cv.part(ellipse(20, 29.5, 1.8, 1.8), '#f2b33d');
      break;
    case 'collar':
      cv.part(SHOULDERS, c);
      cv.part(any(polygon([[8, 24], [15, 27], [15, 32], [9, 31]]), polygon([[32, 24], [25, 27], [25, 32], [31, 31]])), c2); // high collar
      cv.part(polygon([[16.5, 27.5], [23.5, 27.5], [20, 34]]), '#f4ead6');
      break;
    case 'fur':
      cv.part(SHOULDERS, c);
      cv.part(any(...[6, 11, 16, 21, 26, 31].map((x, i) => ellipse(x + 1.5, 30 + (i % 2), 3.4, 2.8))), c2);
      break;
    case 'jester':
      cv.part(SHOULDERS, c, { pattern: (x, y) => ((Math.floor((x + y) / 4) + Math.floor((x - y + 40) / 4)) % 2 ? c2 : null) });
      cv.part(any(...[12, 16, 20, 24, 28].map((x) => ellipse(x, 28.5, 2.2, 1.6))), '#f2b33d');
      break;
    case 'vestments':
      cv.part(SHOULDERS, c);
      cv.part(rect(17.5, 27.5, 22.5, 40), c2);
      cv.part(any(rect(19.5, 30, 20.5, 37), rect(18, 32, 22, 33)), '#f2b33d', { outline: false, rim: false });
      break;
    case 'coat':
      cv.part(SHOULDERS, c);
      cv.part(polygon([[16, 27.5], [24, 27.5], [21, 36], [19, 36]]), '#f4ead6');
      cv.part(any(polygon([[14, 28], [19, 36], [17, 40], [12, 40]]), polygon([[26, 28], [21, 36], [23, 40], [28, 40]])), c2);
      break;
    case 'burlap':
      cv.part(SHOULDERS, c, { pattern: (x, y) => ((x + y) % 4 === 0 ? tone(c, -0.12) : null) });
      cv.part(rect(15, 31, 25, 33), c2, { rim: false });
      break;
  }
}

function drawHead(cv: Canvas, l: Look) {
  if (l.face === 'skull') {
    cv.part(NECK, tone(l.skin, -0.2));
    cv.part(minus(HEAD, rect(0, 24, 40, 40)), l.skin);
    cv.part(ellipse(20, 23.5, 5, 2.6), l.skin);
    return;
  }
  cv.part(NECK, tone(l.skin, -0.12));
  cv.part(EARS, l.skin);
  cv.part(HEAD, l.skin);
}

function drawFace(cv: Canvas, l: Look, mood: Mood) {
  const ink = lineOf(l.skin);
  const eye = l.eyes ?? '#2b2238';
  const lx = 15;
  const rx = 24;
  const ey = 17;
  if (l.face === 'skull') {
    for (const x of [lx - 1, rx - 1]) for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) cv.dot(x + dx, ey - 1 + dy, '#1c1020');
    // The eye lights carry the mood: dim when beaten, looking up when thinking, one burning brighter when smug.
    const glow = mood === 'defeated' ? '#3a4a44' : (l.eyes ?? '#7df0c8');
    const dy = mood === 'thinking' ? -1 : 0;
    cv.dot(lx, ey + dy, glow);
    cv.dot(rx, ey + dy, glow);
    if (mood === 'smug') [[rx + 1, ey], [rx, ey - 1]].forEach(([x, y]) => cv.dot(x, y, '#ffffff'));
    if (mood === 'defeated') [[22, 9], [23, 10], [23, 11], [24, 12]].forEach(([x, y]) => cv.dot(x, y, '#8a7f6a'));
    if (mood === 'thinking') [[31, 6], [33, 5], [35, 4]].forEach(([x, y]) => cv.dot(x, y, '#3b2617'));
    cv.dot(19, 20, '#1c1020');
    cv.dot(20, 20, '#1c1020');
    for (let x = 17; x <= 23; x++) cv.dot(x, 23, x % 2 ? '#1c1020' : l.skin);
    return;
  }
  if (l.face === 'buttons') {
    for (const x of [lx, rx]) {
      cv.dot(x, ey, '#3b2617');
      cv.dot(x + 1, ey, '#3b2617');
      cv.dot(x, ey + 1, '#3b2617');
      cv.dot(x + 1, ey + 1, '#3b2617');
    }
    for (let x = 16; x <= 24; x++) cv.dot(x, 22 + (mood === 'defeated' ? (x === 16 || x === 24 ? 1 : 0) : mood === 'idle' ? 0 : x === 16 || x === 24 ? -1 : 0), x % 2 ? '#3b2617' : l.skin);
    return;
  }
  // Eyes: white with a pupil that looks where the mood says.
  const look = mood === 'thinking' ? -1 : 0;
  for (const x of [lx, rx]) {
    if (mood === 'defeated') {
      cv.dot(x - 1, ey + 1, ink);
      cv.dot(x, ey, ink);
      cv.dot(x + 1, ey, ink);
      cv.dot(x + 2, ey + 1, ink);
      continue;
    }
    cv.dot(x, ey, '#ffffff');
    cv.dot(x + 1, ey, '#ffffff');
    cv.dot(x, ey + 1, '#ffffff');
    cv.dot(x + 1, ey + 1, '#ffffff');
    const pupilX = x + (x === lx ? 1 : 0) + (look < 0 ? -(x === lx ? 1 : 0) : 0);
    cv.dot(pupilX, ey + (mood === 'thinking' ? 0 : 1), eye);
    cv.dot(pupilX, ey + (mood === 'thinking' ? -0 : 0), mood === 'smug' ? ink : eye);
    if (mood === 'smug') {
      cv.dot(x, ey, tone(l.skin, -0.25));
      cv.dot(x + 1, ey, tone(l.skin, -0.25));
    }
  }
  // Brows.
  const brow = tone(l.hairStyle === 'none' ? l.skin : l.hair, -0.25);
  const browY: Record<Mood, [number, number, number, number]> = {
    idle: [15, 15, 15, 15],
    thinking: [14, 15, 15, 15],
    smug: [15, 15, 14, 13],
    defeated: [14, 15, 15, 14],
  };
  const [a, b, c, d] = browY[mood];
  cv.dot(lx - 1, a, brow);
  cv.dot(lx, a, brow);
  cv.dot(lx + 1, b, brow);
  cv.dot(rx, c, brow);
  cv.dot(rx + 1, d, brow);
  cv.dot(rx + 2, d, brow);
  // Nose.
  cv.dot(20, 20, tone(l.skin, -0.18));
  cv.dot(19, 20, tone(l.skin, -0.1));
  // Mouth.
  const m = tone(l.skin, -0.5);
  if (mood === 'idle') [18, 19, 20, 21].forEach((x) => cv.dot(x, 22, m)), cv.dot(17, 21, m), cv.dot(22, 21, m);
  if (mood === 'thinking') [19, 20].forEach((x) => cv.dot(x, 22, m));
  if (mood === 'smug') [18, 19, 20, 21].forEach((x) => cv.dot(x, 22, m)), cv.dot(22, 21, m), cv.dot(23, 20, m);
  if (mood === 'defeated') [18, 19, 20, 21].forEach((x) => cv.dot(x, 22, m)), cv.dot(17, 23, m), cv.dot(22, 23, m);
  // Mood extras.
  if (mood === 'defeated') {
    cv.dot(27, 13, '#8fd3ff');
    cv.dot(27, 14, '#8fd3ff');
    cv.dot(28, 14, '#5fb0e8');
  }
  if (mood === 'thinking') {
    cv.dot(31, 6, '#3b2617');
    cv.dot(33, 5, '#3b2617');
    cv.dot(35, 4, '#3b2617');
  }
}

function drawBeard(cv: Canvas, l: Look) {
  const c = l.hair;
  switch (l.beard) {
    case 'stubble':
      for (let y = 21; y <= 25; y++) for (let x = 14; x <= 26; x++) if ((x + y) % 2 === 0 && HEAD(x + 0.5, y + 0.5) && !(y === 22 && x >= 18 && x <= 21)) cv.dot(x, y, tone(l.skin, -0.25));
      break;
    case 'mustache':
      cv.part(any(ellipse(18, 21.2, 2.6, 1.2), ellipse(22, 21.2, 2.6, 1.2)), c, { rim: false });
      break;
    case 'beard':
      cv.part(minus(only(any(ellipse(20, 23, 7.5, 5), HEAD), rect(0, 20, 40, 40)), ellipse(20, 22.2, 2.6, 1.1)), c);
      break;
    case 'longbeard':
      cv.part(minus(any(only(HEAD, rect(0, 20, 40, 40)), polygon([[12.5, 21], [27.5, 21], [24, 34], [20, 37], [16, 34]])), ellipse(20, 22.2, 2.6, 1.1)), c);
      break;
    default:
      break;
  }
}

function drawFrontHair(cv: Canvas, l: Look) {
  const c = l.hair;
  const cap = only(ellipse(20, 13.5, 9.6, 8.2), rect(0, 0, 40, 13.5));
  switch (l.hairStyle) {
    case 'short':
      cv.part(any(cap, rect(11, 12, 13.5, 18), rect(26.5, 12, 29, 18)), c);
      break;
    case 'messy':
      cv.part(any(cap, polygon([[11, 13], [15, 8], [17, 14], [20, 9], [23, 14], [26, 8], [29, 13], [29, 17], [11, 17]])), c, {
        pattern: (x, y) => (y === 13 && x % 3 === 0 ? tone(c, -0.2) : null),
      });
      break;
    case 'spiky':
      cv.part(any(only(cap, rect(0, 0, 40, 12)), polygon([[10, 12], [12, 3], [15, 9], [18, 1], [21, 8], [24, 1], [26, 9], [29, 3], [30, 12]])), c);
      break;
    case 'long':
    case 'braids':
    case 'ponytail':
    case 'bun':
      cv.part(any(cap, polygon([[11, 13], [20, 10], [29, 13], [29, 16], [24, 12.5], [16, 12.5], [11, 16]])), c);
      break;
    case 'curly':
    case 'wild':
      cv.part(any(...[0, 1, 2, 3, 4].map((i) => ellipse(12.5 + i * 3.75, 10 + (i % 2) * 1.5, 3.4, 3.4))), c);
      break;
    default:
      break;
  }
}

function drawHeadwear(cv: Canvas, l: Look) {
  const c = l.hat ?? l.cloth;
  switch (l.headwear) {
    case 'hood':
    case 'cowl':
      cv.part(minus(any(ellipse(20, 15, 11.5, 12), rect(8.5, 15, 31.5, 26)), ellipse(20, 18.5, 8, 9.5)), c, {
        pattern: l.headwear === 'cowl' ? (_x, y) => (y < 8 ? tone(c, -0.15) : null) : undefined,
      });
      break;
    case 'cap':
      cv.part(only(ellipse(20, 11.5, 9.8, 7), rect(0, 0, 40, 12)), c);
      cv.part(ellipse(26, 12, 7, 1.6), tone(c, -0.15));
      break;
    case 'bandana':
      cv.part(only(ellipse(20, 12.5, 9.8, 7.5), rect(0, 0, 40, 13.5)), c, { pattern: (x, y) => ((x + y) % 5 === 0 ? '#fff4de' : null) });
      cv.part(polygon([[28, 12], [33, 15], [31, 18], [28, 15]]), c);
      break;
    case 'helmet':
      cv.part(any(only(ellipse(20, 14, 10.4, 10), rect(0, 0, 40, 16)), rect(9.6, 14, 12.6, 22), rect(27.4, 14, 30.4, 22)), c);
      cv.part(rect(19, 13, 21, 21), tone(c, -0.18), { rim: false });
      cv.part(ellipse(20, 3.5, 2.2, 2.6), l.cloth2);
      break;
    case 'crown':
      cv.part(polygon([[11.5, 11], [11.5, 4], [14.5, 8], [17, 3], [20, 7.5], [23, 3], [25.5, 8], [28.5, 4], [28.5, 11]]), '#f2b33d');
      cv.dot(20, 9, '#e43b44');
      cv.dot(15, 9, '#0099db');
      cv.dot(25, 9, '#63c74d');
      break;
    case 'circlet':
      cv.part(rect(11, 10.5, 29, 12.5), '#f2b33d', { rim: false });
      cv.part(ellipse(20, 11.5, 1.6, 1.6), l.cloth2);
      break;
    case 'witchhat':
      cv.part(ellipse(20, 11.5, 14, 2.6), c);
      cv.part(polygon([[12.5, 11], [27.5, 11], [24, 4], [27, -1], [19, 3]]), c);
      cv.part(rect(13.5, 8.5, 26.5, 10.5), l.cloth2, { rim: false });
      break;
    case 'wizardhat':
      cv.part(ellipse(20, 11.8, 13, 2.4), c);
      cv.part(polygon([[12.5, 11], [27.5, 11], [20, -2]]), c, { pattern: (x, y) => ((x * 5 + y * 3) % 17 === 0 ? '#f2b33d' : null) });
      break;
    case 'tricorn':
      cv.part(polygon([[7, 11], [20, 6], [33, 11], [27, 13], [20, 11], [13, 13]]), c);
      cv.part(only(ellipse(20, 9.5, 8.5, 5.5), rect(0, 0, 40, 10)), c);
      cv.part(ellipse(26, 7, 1.6, 2.2), '#fff4de');
      break;
    case 'mitre':
      cv.part(polygon([[13, 12], [27, 12], [27, 4], [20, -2], [13, 4]]), c);
      cv.part(any(rect(19, 0, 21, 12), rect(16.5, 4.5, 23.5, 6.5)), '#f2b33d', { rim: false });
      break;
    case 'hornhelm':
      cv.part(any(polygon([[11, 10], [6, 5], [5, -1], [9, 4], [13, 7]]), polygon([[29, 10], [34, 5], [35, -1], [31, 4], [27, 7]])), l.cloth2);
      cv.part(only(ellipse(20, 13, 10.2, 8.5), rect(0, 0, 40, 13)), c);
      break;
    case 'jester':
      cv.part(any(polygon([[11, 12], [6, 4], [3, 9], [7, 6], [14, 9]]), polygon([[29, 12], [34, 4], [37, 9], [33, 6], [26, 9]]), only(ellipse(20, 12, 9.6, 7), rect(0, 0, 40, 12))), c, {
        pattern: (x) => (x > 20 ? l.cloth2 : null),
      });
      cv.part(any(ellipse(3, 9, 1.8, 1.8), ellipse(37, 9, 1.8, 1.8)), '#f2b33d');
      break;
    case 'strawhat':
      cv.part(ellipse(20, 11.5, 15, 3), c, { pattern: (x, y) => ((x + y) % 3 === 0 ? tone(c, -0.15) : null) });
      cv.part(only(ellipse(20, 10, 8, 6), rect(0, 0, 40, 10.5)), c);
      cv.part(rect(12.5, 8.5, 27.5, 10), l.cloth2, { rim: false });
      break;
    case 'leafcrown':
      cv.part(any(...[0, 1, 2, 3, 4, 5, 6].map((i) => ellipse(11.5 + i * 2.85, 10.5 - Math.sin((i / 6) * Math.PI) * 2, 2, 1.4))), '#63c74d');
      cv.part(any(polygon([[12, 8], [9, 1], [11, 0], [13, 6]]), polygon([[28, 8], [31, 1], [29, 0], [27, 6]])), '#8a5a3b'); // little antlers
      break;
    case 'tophat':
      cv.part(ellipse(20, 10.5, 12, 2.2), c);
      cv.part(rect(14, -1, 26, 10), c);
      cv.part(rect(14, 7, 26, 9), l.cloth2, { rim: false });
      break;
    default:
      break;
  }
}

function drawAccessories(cv: Canvas, l: Look) {
  for (const a of l.accessories) {
    switch (a) {
      case 'eyepatch':
        cv.part(ellipse(24.5, 17.5, 2.4, 2.1), '#2b2238', { rim: false });
        for (let x = 12; x <= 28; x++) cv.dot(x, 14 + Math.round((x - 12) / 8), '#2b2238');
        break;
      case 'scar':
        [0, 1, 2, 3].forEach((i) => cv.dot(14 + i, 18 + i, tone(l.skin, -0.35)));
        break;
      case 'glasses':
        for (const x of [14, 23]) {
          [0, 1, 2, 3].forEach((i) => cv.dot(x + i, 16, '#3b2617'));
          [0, 1, 2, 3].forEach((i) => cv.dot(x + i, 19, '#3b2617'));
          cv.dot(x, 17, '#3b2617');
          cv.dot(x, 18, '#3b2617');
          cv.dot(x + 3, 17, '#3b2617');
          cv.dot(x + 3, 18, '#3b2617');
        }
        cv.dot(18, 17, '#3b2617');
        cv.dot(19, 17, '#3b2617');
        cv.dot(20, 17, '#3b2617');
        cv.dot(21, 17, '#3b2617');
        cv.dot(22, 17, '#3b2617');
        break;
      case 'monocle':
        [[23, 16], [24, 15], [25, 15], [26, 16], [26, 17], [26, 18], [25, 19], [24, 19], [23, 18], [23, 17]].forEach(([x, y]) => cv.dot(x, y, '#f2b33d'));
        [20, 21, 22, 23, 24, 25].forEach((i, k) => cv.dot(26, 20 + k, i % 2 ? '#f2b33d' : '#cf8f2a'));
        break;
      case 'earring':
        cv.dot(28, 20, '#f2b33d');
        cv.dot(28, 21, '#f2b33d');
        break;
      case 'freckles':
        [[15, 20], [17, 21], [23, 20], [25, 21], [16, 19], [24, 19]].forEach(([x, y]) => cv.dot(x, y, tone(l.skin, -0.25)));
        break;
      case 'blush':
        [14, 15, 25, 26].forEach((x) => cv.dot(x, 20, tone('#e98ab0', 0.1)));
        break;
      case 'fangs':
        cv.dot(18, 23, '#ffffff');
        cv.dot(21, 23, '#ffffff');
        break;
      case 'mask':
        cv.part(polygon([[11.5, 19.5], [28.5, 19.5], [27, 25], [20, 27.5], [13, 25]]), l.cloth2);
        break;
      case 'warpaint':
        [14, 15, 16].forEach((x) => cv.dot(x, 20, '#d0443a'));
        [23, 24, 25].forEach((x) => cv.dot(x, 20, '#d0443a'));
        break;
      case 'stitches':
        [[12, 15], [13, 16], [26, 22], [27, 21], [26, 20]].forEach(([x, y]) => cv.dot(x, y, '#5d3a22'));
        break;
      case 'glow':
        break;
    }
  }
}

function drawBackdrop(cv: Canvas, l: Look) {
  const inner = tone(l.backdrop, 0.35);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - 20, y - 16) / 26;
      cv.set(x, y, d < 0.55 ? inner : d < 0.85 ? tone(l.backdrop, 0.18) : l.backdrop);
    }
  if (l.accessories.includes('glow')) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - 20, y - 16) < 15 && (x * 13 + y * 7) % 19 === 0) cv.set(x, y, '#7df0c8');
}

/** The pixels of a bust: colour strings (or null) for a 40×40 grid, row by row. */
export function renderBust(l: Look, mood: Mood): (string | null)[] {
  const cv = new Canvas();
  drawBackdrop(cv, l);
  drawBackHair(cv, l);
  drawClothing(cv, l);
  drawHead(cv, l);
  drawFace(cv, l, mood);
  drawBeard(cv, l);
  drawFrontHair(cv, l);
  drawHeadwear(cv, l);
  drawAccessories(cv, l);
  return cv.px;
}

export const BUST_SIZE = N;

const cache = new Map<string, string>();
/** The bust as a PNG data URL (browser only). */
export function bustUrl(id: string, l: Look, mood: Mood): string {
  const key = `${id}:${mood}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const url = pixelsToUrl(renderBust(l, mood), N, N);
  if (url) cache.set(key, url);
  return url;
}
