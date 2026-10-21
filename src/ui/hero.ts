// The player's hero, drawn in code like the portraits: a 48×64 full figure (chibi proportions) so all six gear
// slots show: head, face, body, legs, main hand (viewer's left) and off hand (viewer's right). Pets are 20×20
// sprites drawn beside the hero. Every part is a smooth shape with its own darker outline and a light rim.
import { Canvas, any, ellipse, minus, mirrorAround, only, pixelsToUrl, polygon, rect, segment, tone, type Pt, type Shape } from './pixel';

export const HERO_W = 48;
export const HERO_H = 64;
export const PET_SIZE = 20;

export type Slot = 'head' | 'face' | 'body' | 'legs' | 'main' | 'off';
export const SLOTS: Slot[] = ['head', 'face', 'body', 'legs', 'main', 'off'];

export type HeroHair = 'none' | 'short' | 'messy' | 'long' | 'ponytail' | 'bun' | 'spiky' | 'curly' | 'braids' | 'bob';
export type HeroMood = 'idle' | 'happy' | 'sad';

export interface HeroLook {
  skin: string;
  hair: string;
  hairStyle: HeroHair;
  eyes: string;
  /** For the opponents' figures: facial hair, and a skull or button-eyed face instead of a normal one. */
  beard?: 'none' | 'stubble' | 'mustache' | 'beard' | 'longbeard';
  face?: 'normal' | 'skull' | 'buttons';
}

export type HeadKind = 'strawhat' | 'bandana' | 'hood' | 'witchhat' | 'helmet' | 'jester' | 'tricorn' | 'leafcrown' | 'crown' | 'wizardhat' | 'cap' | 'mitre' | 'hornhelm' | 'tophat' | 'circlet' | 'feather' | 'beanie';
export type FaceKind = 'glasses' | 'monocle' | 'mask' | 'fangs' | 'warpaint' | 'eyepatch';
export type BodyKind = 'tunic' | 'robe' | 'armor' | 'plate' | 'apron' | 'cloak' | 'fur' | 'vest' | 'rags' | 'jester' | 'coat' | 'burlap';
export type LegsKind = 'trousers' | 'patched' | 'greaves';
export type MainKind = 'sword' | 'woodsword' | 'staff' | 'club' | 'hammer' | 'torch' | 'wand' | 'firestaff' | 'bow' | 'lute' | 'quill';
export type OffKind = 'shield' | 'buckler' | 'book' | 'lantern' | 'egg' | 'orb' | 'phylactery' | 'hourglass' | 'compass' | 'pawn' | 'candle';

/** How one piece of gear is drawn: its shape and colours. */
export type GearArt =
  | { slot: 'head'; kind: HeadKind; color: string; color2?: string }
  | { slot: 'face'; kind: FaceKind; color: string; color2?: string }
  | { slot: 'body'; kind: BodyKind; color: string; color2?: string }
  | { slot: 'legs'; kind: LegsKind; color: string; color2?: string }
  | { slot: 'main'; kind: MainKind; color: string; color2?: string }
  | { slot: 'off'; kind: OffKind; color: string; color2?: string };

export type Outfit = { [S in Slot]?: Extract<GearArt, { slot: S }> };

const CX = 24;
const mirror = (pts: Pt[]): Pt[] => mirrorAround(CX, pts);
const WOOD = '#a8743f';
const GOLD = '#f2b33d';
const LINEN = '#eadfc6';

// ---------- the body ----------
const HEAD = ellipse(CX, 18, 10.5, 10);
const EARS = any(ellipse(13.4, 19.5, 1.8, 2.4), ellipse(34.6, 19.5, 1.8, 2.4));
const NECK = rect(21.5, 26, 26.5, 31);
const TORSO = polygon(mirror([[16, 46.5], [16.2, 34], [17.5, 31], [21, 29.6]]));
const ARM_L = polygon([[17.4, 31.2], [14.4, 33.5], [12.4, 42.5], [15.8, 42.8], [17.2, 36]]);
const ARM_R = polygon(mirror([[17.4, 31.2], [14.4, 33.5], [12.4, 42.5], [15.8, 42.8], [17.2, 36]]).slice(5));
const HAND_L = ellipse(14.2, 43.4, 2.4, 2.3);
const HAND_R = ellipse(33.8, 43.4, 2.4, 2.3);
const LEG_L = rect(18.2, 45, 23.4, 56.5);
const LEG_R = rect(24.6, 45, 29.8, 56.5);
const BOOT_L = any(rect(17.6, 54, 23.6, 59.6), ellipse(18.6, 58.4, 2.2, 1.3));
const BOOT_R = any(rect(24.4, 54, 30.4, 59.6), ellipse(29.4, 58.4, 2.2, 1.3));
const HAND_MAIN = { x: 14.2, y: 43.4 };
const HAND_OFF = { x: 33.8, y: 43.4 };

function drawShadow(cv: Canvas) {
  const s = ellipse(CX, 61.2, 12, 2.2);
  for (let y = 56; y < HERO_H; y++) for (let x = 0; x < HERO_W; x++) if (s(x + 0.5, y + 0.5)) cv.set(x, y, '#00000033');
}

// ---------- hair ----------
const TOP_CAP = only(ellipse(CX, 17, 11.3, 10.6), rect(0, 0, 48, 14.5));
const SIDES = any(rect(13, 13, 15.6, 21), rect(32.4, 13, 35, 21));

function drawBackHair(cv: Canvas, l: HeroLook) {
  const c = l.hair;
  switch (l.hairStyle) {
    case 'long':
      cv.part(any(ellipse(CX, 17, 12, 11.2), rect(12, 17, 36, 37)), c);
      break;
    case 'braids':
      cv.part(ellipse(CX, 17, 11.8, 11), c);
      break;
    case 'bob':
      cv.part(any(ellipse(CX, 17.5, 12.2, 11.2), rect(11.8, 17, 36.2, 27.5)), c);
      break;
    case 'ponytail':
      cv.part(any(ellipse(CX, 17, 11.6, 10.8), ellipse(36.5, 24, 3.2, 7.5)), c);
      break;
    case 'bun':
      cv.part(any(ellipse(CX, 17, 11.6, 10.8), ellipse(CX, 6.4, 4.6, 3.8)), c);
      break;
    case 'curly':
      cv.part(any(...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ellipse(CX + Math.cos(i * 0.7 - 0.2) * 10, 16 + Math.sin(i * 0.7 - 0.2) * 9 - 2, 4.4, 4.4))), c);
      break;
    case 'none':
      break;
    default:
      cv.part(ellipse(CX, 17, 11.4, 10.6), c);
  }
}

function drawFrontHair(cv: Canvas, l: HeroLook) {
  const c = l.hair;
  const dark = tone(c, -0.22);
  switch (l.hairStyle) {
    case 'none':
      return;
    case 'spiky':
      cv.part(any(TOP_CAP, SIDES, polygon([[13, 13], [12, 4], [17.5, 9], [19, 1.5], [23, 8], [26, 1], [29, 8], [32, 2.5], [33, 9.5], [36, 5], [35, 14]])), c);
      break;
    case 'messy':
      cv.part(any(TOP_CAP, SIDES, polygon([[14, 13], [17, 17.5], [19, 14], [22, 18], [25, 14], [28, 17.5], [30, 14], [34, 17], [34, 12], [14, 12]])), c);
      break;
    case 'curly':
      cv.part(any(TOP_CAP, ...[15, 19.5, 24, 28.5, 33].map((x) => ellipse(x, 13.2, 3, 2.6))), c);
      break;
    case 'bob':
      cv.part(any(only(ellipse(CX, 17, 11.3, 10.6), rect(0, 0, 48, 15.2)), rect(12.6, 13, 16, 27), rect(32, 13, 35.4, 27)), c);
      break;
    case 'long':
      cv.part(any(TOP_CAP, rect(12.8, 13, 16, 31), rect(32, 13, 35.2, 31), polygon([[15, 13], [18, 16.5], [21, 13]])), c);
      break;
    case 'braids':
      cv.part(any(TOP_CAP, SIDES), c);
      cv.part(any(ellipse(14.2, 31, 2.4, 7), ellipse(33.8, 31, 2.4, 7)), c, { pattern: (_x, y) => (y % 3 === 0 ? dark : null) });
      cv.part(any(rect(12.8, 37, 15.6, 39), rect(32.4, 37, 35.2, 39)), '#e05a5a', { rim: false });
      break;
    default:
      cv.part(any(TOP_CAP, SIDES, polygon([[16, 13], [20, 16], [22, 13]])), c);
  }
  // A parting line keeps the hair from reading as a helmet.
  if (l.hairStyle !== 'spiky' && l.hairStyle !== 'curly') for (let y = 9; y < 13; y++) cv.dot(20 + (y - 9), y, dark);
}

// ---------- face ----------
function drawFace(cv: Canvas, l: HeroLook, mood: HeroMood) {
  const ink = '#3b2617';
  const ey = 18;
  if (l.face === 'skull') {
    for (const x of [18, 26]) for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) cv.dot(x + dx, ey - 1 + dy, '#1c1020');
    const glow = mood === 'sad' ? '#3a4a44' : l.eyes;
    cv.dot(19, ey, glow);
    cv.dot(27, ey, glow);
    cv.dot(23, 22, '#1c1020');
    cv.dot(24, 22, '#1c1020');
    for (let x = 20; x <= 27; x++) cv.dot(x, 25, x % 2 ? '#1c1020' : tone(l.skin, -0.2));
    return;
  }
  if (l.face === 'buttons') {
    for (const x of [19, 27]) cv.part(ellipse(x + 1, ey + 1, 1.8, 1.8), '#3b2617', { rim: false });
    for (let x = 20; x <= 27; x++) cv.dot(x, 23, x % 2 ? '#7a4f2c' : tone(l.skin, -0.2));
    return;
  }
  for (const x of [19, 27]) {
    if (mood === 'happy') {
      cv.dot(x, ey + 1, ink);
      cv.dot(x + 1, ey, ink);
      cv.dot(x + 2, ey + 1, ink);
      continue;
    }
    for (let dy = 0; dy < 3; dy++) {
      cv.dot(x, ey + dy, l.eyes);
      cv.dot(x + 1, ey + dy, l.eyes);
    }
    cv.dot(x, ey, '#ffffff');
    if (mood === 'sad') {
      cv.dot(x - (x < 24 ? 1 : -2), ey - 2, tone(l.hair, -0.2));
      cv.dot(x + (x < 24 ? 0 : 1), ey - 2, tone(l.hair, -0.2));
    }
  }
  const blush = tone('#e86a6a', 0.35);
  for (const x of [16, 17, 30, 31]) cv.dot(x, 22, blush);
  if (mood === 'sad') [[22, 24], [23, 23], [24, 23], [25, 24]].forEach(([x, y]) => cv.dot(x, y, ink));
  else if (mood === 'happy') [[22, 22], [23, 23], [24, 23], [25, 22]].forEach(([x, y]) => cv.dot(x, y, ink));
  else [[23, 23], [24, 23]].forEach(([x, y]) => cv.dot(x, y, ink));
}

function drawBeard(cv: Canvas, l: HeroLook) {
  const c = l.hair;
  const mouth = ellipse(CX, 23.4, 2.6, 1);
  switch (l.beard) {
    case 'stubble':
      for (let y = 21; y <= 27; y++) for (let x = 15; x <= 33; x++) if ((x + y) % 2 === 0 && HEAD(x + 0.5, y + 0.5) && !mouth(x + 0.5, y + 0.5)) cv.dot(x, y, tone(l.skin, -0.22));
      break;
    case 'mustache':
      cv.part(any(ellipse(21.4, 22.4, 3, 1.3), ellipse(26.6, 22.4, 3, 1.3)), c, { rim: false });
      break;
    case 'beard':
      cv.part(minus(only(any(ellipse(CX, 24.5, 9, 5.5), HEAD), rect(0, 21, 48, 48)), mouth), c);
      break;
    case 'longbeard':
      cv.part(minus(any(only(HEAD, rect(0, 21, 48, 48)), polygon([[15, 22], [33, 22], [29, 37], [24, 41], [19, 37]])), mouth), c);
      break;
    default:
      break;
  }
}

// ---------- gear ----------
function drawBackGear(cv: Canvas, o: Outfit) {
  if (o.body?.kind === 'cloak') cv.part(polygon(mirror([[13, 58], [14.5, 36], [17, 30.5], [21, 29.5]])), o.body.color);
  if (o.body?.kind === 'robe') cv.part(polygon(mirror([[14.5, 58], [16.2, 40], [18, 31], [21, 29.6]])), o.body.color);
  if (o.head?.kind === 'hood') cv.part(any(ellipse(CX, 17.5, 13.2, 13), rect(11, 18, 37, 32)), o.head.color);
}

function drawLegs(cv: Canvas, look: HeroLook | null, o: Outfit) {
  const g = o.legs;
  if (!g) {
    cv.part(any(LEG_L, LEG_R), look?.skin ?? LINEN);
    cv.part(rect(17.6, 44, 30.4, 48.5), LINEN);
    return;
  }
  const boots = g.color2 ?? '#6b4a2f';
  if (g.kind === 'greaves') {
    cv.part(any(LEG_L, LEG_R), g.color);
    cv.part(any(rect(18, 49, 23.6, 51.5), rect(24.4, 49, 30, 51.5)), tone(g.color, 0.2), { rim: false });
    cv.part(any(BOOT_L, BOOT_R), tone(g.color, -0.15));
    return;
  }
  cv.part(any(LEG_L, LEG_R, rect(17.6, 44, 30.4, 48)), g.color, {
    pattern: g.kind === 'patched' ? (x, y) => ((x >= 19 && x < 22 && y >= 49 && y < 52) || (x >= 26 && x < 29 && y >= 46 && y < 48) ? (g.color2 === boots ? tone(g.color, 0.3) : tone(g.color, 0.3)) : null) : undefined,
  });
  cv.part(any(BOOT_L, BOOT_R), boots);
}

function drawBody(cv: Canvas, look: HeroLook | null, o: Outfit, withArms: boolean) {
  const g = o.body;
  const c = g?.color ?? LINEN;
  const c2 = g?.color2 ?? tone(c, -0.3);
  const sleeve = g?.kind === 'armor' || g?.kind === 'plate' ? tone(c, -0.08) : g?.kind === 'apron' || g?.kind === 'vest' ? LINEN : c;
  if (withArms) cv.part(any(ARM_L, ARM_R), sleeve);
  const vneck = polygon([[21, 29.8], [27, 29.8], [24, 34]]);
  switch (g?.kind) {
    case 'robe':
      cv.part(polygon(mirror([[15, 56], [16.2, 40], [17.5, 31], [21, 29.6]])), c);
      cv.part(rect(22.5, 31, 25.5, 56), c2, { rim: false });
      cv.part(rect(16, 41, 32, 43), GOLD, { rim: false });
      break;
    case 'armor':
    case 'plate':
      cv.part(TORSO, c);
      cv.part(polygon([[19, 31], [29, 31], [28, 47], [20, 47]]), c2);
      cv.part(any(ellipse(16.4, 32.6, 3.8, 3), ellipse(31.6, 32.6, 3.8, 3)), tone(c, 0.12));
      if (g.kind === 'plate') cv.part(any(polygon([[13.5, 31], [14, 26.5], [16.5, 30]]), polygon([[34.5, 31], [34, 26.5], [31.5, 30]])), tone(c, 0.25));
      else {
        cv.dot(15, 31, '#ffffff');
        cv.dot(31, 31, '#ffffff');
      }
      break;
    case 'apron':
      cv.part(TORSO, LINEN);
      cv.part(vneck, look?.skin ?? LINEN);
      cv.part(rect(18, 34, 30, 50), c);
      cv.part(any(rect(18, 30.5, 19.6, 34), rect(28.4, 30.5, 30, 34)), tone(c, -0.15), { rim: false });
      cv.part(rect(21, 39, 27, 43), c2, { rim: false });
      break;
    case 'vest':
      cv.part(TORSO, LINEN);
      cv.part(any(polygon([[16.2, 34], [17.5, 31], [21, 29.6], [22.5, 46.5], [16, 46.5]]), polygon([[31.8, 34], [30.5, 31], [27, 29.6], [25.5, 46.5], [32, 46.5]])), c);
      cv.part(rect(16, 43, 32, 45), c2, { rim: false });
      break;
    case 'fur':
      cv.part(TORSO, c);
      cv.part(rect(16, 42.5, 32, 45), '#6b4a2f', { rim: false });
      cv.part(any(...[15.5, 19.5, 24, 28.5, 32.5].map((x, i) => ellipse(x, 31.6 + (i % 2) * 0.6, 3.2, 2.6))), c2);
      break;
    case 'cloak':
      cv.part(TORSO, c2);
      cv.part(vneck, look?.skin ?? LINEN);
      cv.part(rect(16, 42.5, 32, 44.6), '#6b4a2f', { rim: false });
      cv.part(any(polygon([[16, 33], [17.5, 30.6], [21, 29.6], [19, 47], [15, 47]]), polygon([[32, 33], [30.5, 30.6], [27, 29.6], [29, 47], [33, 47]])), c);
      cv.part(ellipse(CX, 31.2, 1.8, 1.6), GOLD);
      break;
    case 'rags':
      cv.part(TORSO, c, { pattern: (x, y) => ((x * 7 + y * 3) % 17 === 0 ? tone(c, -0.3) : x > 26 && x < 31 && y > 36 && y < 41 ? c2 : null) });
      cv.part(vneck, look?.skin ?? LINEN);
      cv.part(polygon([[16, 45], [18, 48], [20, 45.5], [23, 48.5], [26, 45.5], [29, 48], [32, 45]]), c, { rim: false });
      break;
    case 'jester':
      cv.part(TORSO, c, { pattern: (x, y) => ((Math.floor((x + y) / 4) + Math.floor((x - y + 48) / 4)) % 2 ? c2 : null) });
      cv.part(any(...[17, 20.5, 24, 27.5, 31].map((x) => ellipse(x, 30.6, 2, 1.5))), GOLD);
      break;
    case 'coat':
      cv.part(TORSO, c);
      cv.part(polygon([[21, 29.8], [27, 29.8], [25, 38], [23, 38]]), '#f4ead6');
      cv.part(any(polygon([[18, 30.5], [23, 38], [22, 47], [16, 47], [16.2, 34]]), polygon([[30, 30.5], [25, 38], [26, 47], [32, 47], [31.8, 34]])), c2);
      cv.part(any(ellipse(21.5, 41, 0.9, 0.9), ellipse(21.5, 44, 0.9, 0.9)), GOLD, { outline: false, rim: false });
      break;
    case 'burlap':
      cv.part(TORSO, c, { pattern: (x, y) => ((x + y) % 4 === 0 ? tone(c, -0.12) : null) });
      cv.part(rect(16, 41, 32, 43), c2, { rim: false });
      break;
    default:
      // A tunic (and the plain linen shirt when nothing is worn).
      cv.part(TORSO, c);
      cv.part(vneck, look?.skin ?? LINEN);
      if (g) cv.part(rect(16, 42.5, 32, 44.8), c2, { rim: false });
      if (g) cv.part(rect(23, 42.6, 25, 44.7), GOLD, { outline: false, rim: false });
  }
}

function drawHands(cv: Canvas, skin: string, o: Outfit) {
  const glove = o.body?.kind === 'armor' || o.body?.kind === 'plate' ? tone(o.body.color, -0.1) : skin;
  cv.part(any(HAND_L, HAND_R), glove);
}

function drawMain(cv: Canvas, g: Extract<GearArt, { slot: 'main' }>) {
  const { x, y } = HAND_MAIN;
  const c = g.color;
  const c2 = g.color2 ?? GOLD;
  switch (g.kind) {
    case 'sword':
    case 'woodsword':
      cv.part(polygon([[x - 1.6, y - 2], [x - 1.6, y - 19], [x, y - 22], [x + 1.6, y - 19], [x + 1.6, y - 2]]), g.kind === 'woodsword' ? WOOD : c);
      cv.part(rect(x - 4, y - 3.4, x + 4, y - 1.2), c2);
      cv.part(ellipse(x, y + 3.4, 1.5, 1.5), c2);
      break;
    case 'staff':
      cv.part(segment(x, y + 16, x, y - 28, 2.6), c);
      cv.part(ellipse(x, y - 30, 3.2, 3.2), c2);
      break;
    case 'firestaff':
      cv.part(segment(x, y + 16, x, y - 26, 2.6), c);
      cv.part(polygon([[x - 3.5, y - 26], [x - 4, y - 30], [x - 1.5, y - 33], [x, y - 37], [x + 1.6, y - 33], [x + 4, y - 30], [x + 3.5, y - 26]]), c2);
      cv.part(ellipse(x, y - 29, 1.6, 2.2), GOLD, { outline: false });
      break;
    case 'club':
      cv.part(any(segment(x, y + 2, x - 1.5, y - 10, 3), ellipse(x - 2, y - 15, 3.8, 6)), c);
      break;
    case 'hammer':
      cv.part(segment(x, y + 6, x, y - 13, 2.2), WOOD);
      cv.part(rect(x - 5, y - 19, x + 5, y - 12.5), c);
      break;
    case 'torch':
      cv.part(segment(x, y + 4, x, y - 10, 2.4), WOOD);
      cv.part(polygon([[x - 3.2, y - 10], [x - 3.6, y - 14], [x - 1.2, y - 17], [x, y - 21], [x + 1.4, y - 17], [x + 3.6, y - 14], [x + 3.2, y - 10]]), c);
      cv.part(ellipse(x, y - 13, 1.5, 2.4), c2, { outline: false });
      break;
    case 'wand':
      cv.part(segment(x, y + 1, x - 3, y - 11, 1.8), c);
      cv.part(ellipse(x - 3.2, y - 12.5, 1.8, 1.8), c2);
      cv.dot(Math.round(x - 6), Math.round(y - 15), tone(c2, 0.5));
      cv.dot(Math.round(x - 1), Math.round(y - 16), tone(c2, 0.5));
      break;
    case 'bow':
      cv.part(only(minus(ellipse(x + 2, y - 4, 7, 15), ellipse(x + 3.6, y - 4, 6, 13.6)), rect(0, 0, x + 2.5, 64)), c);
      for (let yy = Math.round(y - 18); yy <= Math.round(y + 10); yy++) cv.dot(Math.round(x + 2), yy, '#efe6d6');
      break;
    case 'quill':
      cv.part(polygon([[x - 1, y + 1], [x - 4, y - 8], [x - 6, y - 16], [x - 3, y - 13], [x - 1, y - 6], [x + 0.5, y]]), c);
      for (let k = 0; k < 6; k++) cv.dot(Math.round(x - 1 - k * 0.7), Math.round(y - 3 - k * 2), tone(c, -0.25));
      break;
    case 'lute':
      cv.part(segment(x + 1, y - 2, x + 6, y - 14, 2), tone(c, -0.2));
      cv.part(ellipse(x, y + 1, 4.4, 5), c);
      cv.part(ellipse(x, y + 1, 1.3, 1.3), '#3b2617', { rim: false, outline: false });
      break;
  }
}

function drawOff(cv: Canvas, g: Extract<GearArt, { slot: 'off' }>) {
  const { x, y } = HAND_OFF;
  const c = g.color;
  const c2 = g.color2 ?? GOLD;
  switch (g.kind) {
    case 'shield':
      cv.part(polygon([[x - 6, y - 8], [x + 7, y - 8], [x + 7, y + 1], [x + 0.5, y + 8], [x - 6, y + 1]]), c, {
        pattern: (px, py) => (Math.abs(px + 0.5 - (x + 0.5)) < 1.3 || Math.abs(py + 0.5 - (y - 2)) < 1.3 ? c2 : null),
      });
      break;
    case 'buckler':
      cv.part(ellipse(x + 0.5, y - 1, 6.2, 6.4), c);
      cv.part(ellipse(x + 0.5, y - 1, 2.2, 2.2), c2);
      break;
    case 'book':
      cv.part(rect(x - 3.5, y - 6, x + 5.5, y + 5), c);
      cv.part(rect(x + 4, y - 5, x + 5.5, y + 4), '#f4ead6', { outline: false, rim: false });
      cv.part(rect(x - 1, y - 3, x + 2.5, y + 1), c2, { rim: false });
      break;
    case 'lantern':
      for (let yy = Math.round(y); yy < Math.round(y + 3); yy++) cv.dot(Math.round(x), yy, '#3b2617');
      cv.part(rect(x - 3, y + 2.5, x + 3, y + 10.5), c);
      cv.part(rect(x - 1.6, y + 4, x + 1.6, y + 9), c2, { outline: false, rim: false });
      cv.part(polygon([[x - 3.5, y + 3], [x, y + 0.6], [x + 3.5, y + 3]]), tone(c, -0.15));
      break;
    case 'egg':
      cv.part(ellipse(x + 0.5, y - 3, 4, 5), c, { pattern: (px, py) => ((px * 5 + py * 3) % 11 === 0 ? c2 : null) });
      break;
    case 'orb':
      cv.part(ellipse(x + 0.5, y - 4.5, 4, 4), c);
      cv.dot(Math.round(x - 1), Math.round(y - 7), '#ffffff');
      break;
    case 'hourglass':
      cv.part(any(rect(x - 3.5, y - 10, x + 4.5, y - 8.5), rect(x - 3.5, y + 0.5, x + 4.5, y + 2)), WOOD);
      cv.part(polygon([[x - 2.5, y - 8.5], [x + 3.5, y - 8.5], [x + 1, y - 4], [x + 3.5, y + 0.5], [x - 2.5, y + 0.5], [x, y - 4]]), '#d8eef4');
      cv.part(any(polygon([[x - 1.2, y - 7.5], [x + 2.2, y - 7.5], [x + 0.5, y - 5]]), polygon([[x - 1.5, y + 0.5], [x + 2.5, y + 0.5], [x + 0.5, y - 2]])), c, { outline: false, rim: false });
      break;
    case 'compass':
      cv.part(ellipse(x + 0.5, y - 3, 4.4, 4.4), c);
      cv.part(ellipse(x + 0.5, y - 3, 3, 3), '#f4ead6', { outline: false, rim: false });
      cv.dot(Math.round(x), Math.round(y - 5), '#d0443a');
      cv.dot(Math.round(x + 1), Math.round(y - 1), '#3b2617');
      break;
    case 'pawn':
      cv.part(any(ellipse(x + 0.5, y - 9, 2.2, 2.2), polygon([[x - 1.5, y - 7], [x + 2.5, y - 7], [x + 3.5, y - 1], [x - 2.5, y - 1]]), rect(x - 3.5, y - 1, x + 4.5, y + 1)), GOLD);
      break;
    case 'candle':
      cv.part(ellipse(x + 0.5, y + 0.5, 4, 1.4), '#c9a04a');
      cv.part(rect(x - 1, y - 8, x + 2, y), '#f4ead6');
      cv.part(polygon([[x - 0.5, y - 8.5], [x + 0.5, y - 12], [x + 1.5, y - 8.5]]), '#f2b33d', { outline: false });
      break;
    case 'phylactery':
      cv.part(rect(x - 2.5, y - 9, x + 3.5, y + 0), '#b8d8d0');
      cv.part(rect(x - 1.2, y - 6, x + 2.2, y - 1), c, { outline: false });
      cv.part(rect(x - 1.5, y - 11, x + 2.5, y - 8.5), c2);
      break;
  }
}

function drawFaceGear(cv: Canvas, g: Extract<GearArt, { slot: 'face' }>) {
  const c = g.color;
  switch (g.kind) {
    case 'glasses':
      for (const x0 of [17.5, 25.5]) cv.part(minus(rect(x0, 16.6, x0 + 5, 21.6), rect(x0 + 1, 17.6, x0 + 4, 20.6)), c, { outline: false, rim: false });
      cv.part(rect(22.5, 17.6, 25.5, 18.6), c, { outline: false, rim: false });
      break;
    case 'monocle':
      cv.part(minus(ellipse(28, 19.5, 3, 3), ellipse(28, 19.5, 2, 2)), c, { outline: false, rim: false });
      for (let y = 22; y < 30; y++) cv.dot(y % 2 ? 31 : 30, y, c);
      break;
    case 'mask':
      cv.part(minus(rect(13.4, 16.4, 34.6, 21.8), rect(18.6, 17.6, 21.6, 21), rect(26.6, 17.6, 29.6, 21)), c);
      break;
    case 'fangs':
      [[22, 24], [25, 24]].forEach(([x, y]) => cv.dot(x, y, '#ffffff'));
      break;
    case 'warpaint':
      for (const x of [16, 17, 30, 31]) for (const y of [20, 22]) cv.dot(x, y, c);
      break;
    case 'eyepatch':
      cv.part(rect(26.2, 17, 30.2, 21.4), c);
      for (let x = 14; x < 34; x++) if (x < 26 || x > 30) cv.dot(x, Math.round(15 + Math.abs(x - 28) * 0.15), tone(c, -0.2));
      break;
  }
}

function drawHeadGear(cv: Canvas, g: Extract<GearArt, { slot: 'head' }>) {
  const c = g.color;
  const c2 = g.color2 ?? tone(c, -0.3);
  switch (g.kind) {
    case 'strawhat':
      cv.part(ellipse(CX, 12.5, 15.5, 3.2), c, { pattern: (x, y) => ((x + y) % 3 === 0 ? tone(c, -0.1) : null) });
      cv.part(only(ellipse(CX, 10, 7.8, 6), rect(0, 0, 48, 12)), c);
      cv.part(rect(16.4, 9.4, 31.6, 11.4), c2, { rim: false });
      break;
    case 'bandana':
      cv.part(only(ellipse(CX, 17, 11.6, 10.8), rect(0, 0, 48, 14)), c, { pattern: (x, y) => ((x * 3 + y * 5) % 9 === 0 ? '#f4ead6' : null) });
      cv.part(any(ellipse(35.5, 13.5, 2.6, 2.2), polygon([[35, 13], [40, 18], [38, 19.5]])), c);
      break;
    case 'hood':
      cv.part(minus(any(ellipse(CX, 17.5, 13, 12.8), rect(11.4, 18, 36.6, 31)), ellipse(CX, 19, 9.2, 9.4), rect(16, 26, 32, 31)), c);
      break;
    case 'witchhat':
    case 'wizardhat':
      cv.part(ellipse(CX, 11.8, 15, 2.8), c);
      cv.part(polygon(g.kind === 'witchhat' ? [[16.5, 11.5], [31.5, 11.5], [28, 4], [33, 0.5], [24, 1.5], [20, 5]] : [[16.5, 11.5], [31.5, 11.5], [26, 0], [24, -1], [21, 4]]), c);
      cv.part(rect(17.6, 8.6, 30.4, 10.8), c2, { rim: false });
      if (g.kind === 'wizardhat') [[22, 6], [26, 4], [27, 8]].forEach(([x, y]) => cv.dot(x, y, GOLD));
      break;
    case 'helmet':
      cv.part(any(only(ellipse(CX, 18, 11.8, 11.4), rect(0, 0, 48, 16.4)), rect(12.3, 14, 15.8, 25), rect(32.2, 14, 35.7, 25)), c);
      cv.part(rect(22.8, 6.5, 25.2, 16.4), c2, { rim: false });
      [[15, 15], [33, 15]].forEach(([x, y]) => cv.dot(x, y, '#ffffff'));
      break;
    case 'cap':
      cv.part(only(ellipse(CX, 17, 11.4, 10.6), rect(0, 0, 48, 13.5)), c);
      cv.part(ellipse(18, 13.5, 7, 1.8), c2);
      break;
    case 'jester':
      cv.part(only(ellipse(CX, 17, 11.4, 10.6), rect(0, 0, 48, 13.5)), c);
      cv.part(polygon([[13, 13], [14, 6], [8, 2], [5, 9], [9, 6.5], [18, 9]]), c);
      cv.part(polygon([[35, 13], [34, 6], [40, 2], [43, 9], [39, 6.5], [30, 9]]), c2);
      cv.part(any(ellipse(5.4, 9.8, 1.8, 1.8), ellipse(42.6, 9.8, 1.8, 1.8), ellipse(CX, 5.6, 1.8, 1.8)), GOLD);
      cv.part(polygon([[19, 9], [24, 4], [29, 9]]), c2);
      break;
    case 'tricorn':
      cv.part(polygon([[8.5, 13], [15, 6.5], [24, 4.5], [33, 6.5], [39.5, 13], [24, 10.5]]), c);
      cv.part(polygon([[11, 12], [24, 9.2], [37, 12], [24, 10.6]]), c2, { outline: false, rim: false });
      break;
    case 'leafcrown':
      cv.part(any(...[14.5, 18, 21.5, 26.5, 30, 33.5].map((x, i) => ellipse(x, 10.5 + Math.abs(x - CX) * 0.15 - (i % 2), 2.4, 1.6))), c);
      cv.part(any(ellipse(CX, 9, 1.8, 1.8), ellipse(19.5, 9.6, 1.2, 1.2), ellipse(28.5, 9.6, 1.2, 1.2)), c2);
      break;
    case 'feather':
      cv.part(only(ellipse(CX, 17, 11.4, 10.6), rect(0, 0, 48, 13)), c2);
      cv.part(polygon([[30, 11], [34, 2], [38, -1], [36, 5], [32, 12]]), c);
      cv.part(polygon([[32, 9], [36, 1], [37, 2], [33, 10]]), GOLD, { outline: false, rim: false });
      break;
    case 'beanie':
      cv.part(only(ellipse(CX, 16.5, 11.6, 10.8), rect(0, 0, 48, 14)), c, { pattern: (x) => (x % 3 === 0 ? tone(c, -0.12) : null) });
      cv.part(rect(12.6, 11.5, 35.4, 14.5), c2, { rim: false });
      cv.part(ellipse(CX, 5.5, 2.6, 2.4), c2);
      break;
    case 'mitre':
      cv.part(polygon([[16, 13], [32, 13], [32, 4], [24, -2], [16, 4]]), c);
      cv.part(any(rect(23, 0, 25, 13), rect(20, 5, 28, 7)), GOLD, { rim: false });
      break;
    case 'hornhelm':
      cv.part(any(polygon([[14, 11], [8, 6], [7, -1], [11, 4], [16, 8]]), polygon([[34, 11], [40, 6], [41, -1], [37, 4], [32, 8]])), c2);
      cv.part(only(ellipse(CX, 17, 11.8, 11), rect(0, 0, 48, 14.5)), c);
      break;
    case 'tophat':
      cv.part(ellipse(CX, 11.6, 14, 2.4), c);
      cv.part(rect(17, -1, 31, 11), c);
      cv.part(rect(17, 8, 31, 10), c2, { rim: false });
      break;
    case 'circlet':
      cv.part(rect(13.4, 11, 34.6, 13), GOLD, { rim: false });
      cv.part(ellipse(CX, 12, 1.7, 1.7), c2);
      break;
    case 'crown':
      cv.part(polygon([[15.5, 12], [15, 3.5], [18.5, 7], [21, 1.5], [24, 6], [27, 1.5], [29.5, 7], [33, 3.5], [32.5, 12]]), c);
      cv.part(any(ellipse(CX, 9, 1.5, 1.5), ellipse(19, 9.4, 1.2, 1.2), ellipse(29, 9.4, 1.2, 1.2)), c2, { outline: false });
      break;
  }
}

/** Which hair a headwear hides: none, only the top (a hat), or all of it (a hood or helmet). */
const HIDES: Partial<Record<HeadKind, 'all' | 'top'>> = { hood: 'all', helmet: 'all', bandana: 'top', cap: 'top', jester: 'top' };

export interface HeroOptions {
  mood?: HeroMood;
  /** Draw only this slot's gear, without the hero (for item icons). */
  only?: Slot;
  shadow?: boolean;
}

/** The hero's pixels: colour strings (or null) for a 48×64 grid, row by row. */
export function renderHero(look: HeroLook, outfit: Outfit, opts: HeroOptions = {}): (string | null)[] {
  const cv = new Canvas(HERO_W, HERO_H);
  if (opts.only) {
    const g = outfit[opts.only];
    if (!g) return cv.px;
    const solo = { [opts.only]: g } as Outfit;
    if (g.slot === 'head') {
      if (g.kind === 'hood') drawBackGear(cv, solo);
      drawHeadGear(cv, g);
    } else if (g.slot === 'face') {
      // Face gear needs a face to sit on: a faint head behind it.
      cv.part(any(HEAD, EARS), '#f1e4d0', { rim: false });
      drawFaceGear(cv, g);
    }
    else if (g.slot === 'body') {
      drawBackGear(cv, solo);
      drawBody(cv, null, solo, true);
    } else if (g.slot === 'legs') drawLegs(cv, null, solo);
    else if (g.slot === 'main') drawMain(cv, g);
    else drawOff(cv, g);
    return cv.px;
  }
  const hides = outfit.head ? HIDES[outfit.head.kind] : undefined;
  if (opts.shadow !== false) drawShadow(cv);
  drawBackGear(cv, outfit);
  if (!hides) drawBackHair(cv, look);
  drawLegs(cv, look, outfit);
  drawBody(cv, look, outfit, true);
  if (outfit.main) drawMain(cv, outfit.main);
  if (outfit.off) drawOff(cv, outfit.off);
  drawHands(cv, look.skin, outfit);
  // The lute and the shield sit in front of the hand that holds them.
  if (outfit.main?.kind === 'lute') drawMain(cv, outfit.main);
  if (outfit.off && ['shield', 'buckler', 'book'].includes(outfit.off.kind)) drawOff(cv, outfit.off);
  cv.part(NECK, tone(look.skin, -0.12));
  cv.part(EARS, look.skin);
  cv.part(HEAD, look.skin);
  drawFace(cv, look, opts.mood ?? 'idle');
  drawBeard(cv, look);
  if (hides !== 'all') drawFrontHair(cv, look);
  if (outfit.face) drawFaceGear(cv, outfit.face);
  if (outfit.head) drawHeadGear(cv, outfit.head);
  return cv.px;
}

/** The smallest square around the drawn pixels, padded, as its own pixel grid (for item icons). */
export function cropSquare(px: (string | null)[], w: number, h: number, pad = 2, min = 14): { px: (string | null)[]; size: number } {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  px.forEach((c, i) => {
    if (!c) return;
    const x = i % w;
    const y = Math.floor(i / w);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  });
  if (x1 < 0) return { px: new Array(min * min).fill(null), size: min };
  const size = Math.max(min, x1 - x0 + 1 + 2 * pad, y1 - y0 + 1 + 2 * pad);
  const ox = Math.floor((x0 + x1 + 1) / 2 - size / 2);
  const oy = Math.floor((y0 + y1 + 1) / 2 - size / 2);
  const out: (string | null)[] = new Array(size * size).fill(null);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sx = x + ox;
      const sy = y + oy;
      if (sx >= 0 && sy >= 0 && sx < w && sy < h) out[y * size + x] = px[sy * w + sx];
    }
  return { px: out, size };
}

// ---------- pets ----------
export type PetKind = 'chick' | 'cat' | 'dog' | 'frog' | 'owl' | 'fox' | 'slime' | 'bat' | 'ghost' | 'dragon';

/** A pet grows with you: 0 as found, 1 with an accessory (25 games together), 2 grown up (100 games). */
export type PetStage = 0 | 1 | 2;
export const petSize = (stage: PetStage) => (stage === 2 ? 26 : PET_SIZE);

export function renderPet(kind: PetKind, stage: PetStage = 0): (string | null)[] {
  // Drawn in a 20-pixel design space; the grown form is the same drawing 1.3 times larger on a 26-pixel canvas.
  const N = petSize(stage);
  const k = stage === 2 ? 1.3 : 1;
  const tx = (x: number) => N / 2 + (x - 10) * k;
  const ty = (y: number) => N - 1 - (19 - y) * k;
  const E = (x: number, y: number, rx: number, ry: number) => ellipse(tx(x), ty(y), rx * k, ry * k);
  const R = (x0: number, y0: number, x1: number, y1: number) => rect(tx(x0), ty(y0), tx(x1), ty(y1));
  const P = (pts: Pt[]) => polygon(pts.map(([x, y]) => [tx(x), ty(y)] as Pt));
  const Sg = (x0: number, y0: number, x1: number, y1: number, w: number) => segment(tx(x0), ty(y0), tx(x1), ty(y1), w * k);
  const dot = (x: number, y: number, c: string) => cv.dot(Math.round(tx(x)), Math.round(ty(y)), c);
  const eyes = (pts: Pt[], c = '#2b1a12') => pts.forEach(([x, y]) => (dot(x, y, c), dot(x, y + 1, c)));
  const cv = new Canvas(N);
  const shadow: Shape = E(10, 18.6, 6, 1.2);
  if (kind !== 'ghost' && kind !== 'bat') for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (shadow(x + 0.5, y + 0.5)) cv.set(x, y, '#00000033');
  // Grown dragons get wings, behind the body.
  if (kind === 'dragon' && stage === 2) cv.part(any(P([[12, 11], [16, 3], [19, 6], [17, 11]]), P([[9, 11], [5, 4], [3, 9], [7, 12]])), '#3f8a44');
  switch (kind) {
    case 'chick':
      cv.part(E(10, 13, 5.4, 5), stage === 2 ? '#f4f0e6' : '#f8d548');
      cv.part(P([[14.6, 12], [17.6, 13], [14.6, 14.2]]), '#e8833a');
      cv.part(E(8.6, 14.4, 2.4, 1.6), '#e8b830', { rim: false });
      eyes([[12, 11]]);
      cv.part(any(R(8, 17.4, 9, 19), R(11, 17.4, 12, 19)), '#e8833a', { outline: false, rim: false });
      break;
    case 'cat':
      cv.part(Sg(15, 16, 18, 9, 1.8), '#e09a4a');
      cv.part(E(10.5, 14.5, 5.4, 3.8), '#e09a4a');
      cv.part(any(E(8, 9.5, 4.4, 3.8), P([[4.2, 8], [4.6, 3.6], [7.4, 6.5]]), P([[11.8, 8], [11.4, 3.6], [8.6, 6.5]])), '#e09a4a');
      eyes([[6, 9], [9, 9]], '#3b5a2a');
      dot(7, 11, '#c0605a');
      break;
    case 'dog':
      cv.part(Sg(15.5, 13, 18, 9.5, 1.8), '#b07a4a');
      cv.part(E(11, 14.5, 5.6, 3.8), '#b07a4a');
      cv.part(E(7.6, 9.6, 4.2, 4), '#b07a4a');
      cv.part(any(E(4, 10, 1.6, 3), E(11, 10, 1.6, 3)), '#7a4f2c');
      cv.part(E(6, 12, 1.8, 1.3), '#e8d4b0', { rim: false });
      eyes([[6, 8], [9, 8]]);
      dot(5, 11, '#2b1a12');
      break;
    case 'frog':
      cv.part(E(10, 14, 6.4, 4.2), '#6cc04a');
      cv.part(any(E(6.6, 9.6, 2.4, 2.4), E(13.4, 9.6, 2.4, 2.4)), '#6cc04a');
      cv.part(E(10, 15.4, 4, 2), '#c8e88a', { rim: false });
      eyes([[6, 9], [13, 9]]);
      break;
    case 'owl':
      cv.part(E(10, 12, 5.6, 6.6), '#9a7a5a');
      cv.part(any(P([[4.6, 7], [5.4, 3.4], [8, 6]]), P([[15.4, 7], [14.6, 3.4], [12, 6]])), '#9a7a5a');
      cv.part(E(10, 14.6, 3.4, 3.2), '#e8d4b0', { rim: false });
      cv.part(any(E(7.6, 9.6, 2.2, 2.2), E(12.4, 9.6, 2.2, 2.2)), '#f8f0dc', { rim: false });
      eyes([[7, 9], [12, 9]]);
      dot(10, 11, '#e8a03a');
      break;
    case 'fox':
      cv.part(E(15, 13, 3.6, 2.4), '#e8743a');
      dot(17, 13, '#ffffff');
      dot(18, 13, '#ffffff');
      cv.part(E(10, 14.6, 5, 3.6), '#e8743a');
      cv.part(any(E(7.8, 9.8, 4, 3.4), P([[4.2, 8.4], [4.4, 3.6], [7.4, 7]]), P([[11.4, 8.4], [11.2, 3.6], [8.2, 7]])), '#e8743a');
      cv.part(E(7.8, 11.6, 2.6, 1.4), '#fff4e4', { rim: false });
      eyes([[6, 9], [9, 9]]);
      break;
    case 'slime':
      cv.part(any(E(10, 14, 6.6, 4.6), E(10, 11, 4, 4)), '#5ac8e8');
      dot(7, 9, '#ffffff');
      dot(8, 9, '#ffffff');
      eyes([[8, 12], [12, 12]]);
      break;
    case 'bat':
      cv.part(any(P([[10, 9], [2, 6], [3, 10], [1, 12], [6, 12], [10, 13]]), P([[10, 9], [18, 6], [17, 10], [19, 12], [14, 12], [10, 13]])), '#6a4a7a');
      cv.part(any(E(10, 11, 3, 3.2), P([[7.6, 9], [8, 6], [9.6, 8.4]]), P([[12.4, 9], [12, 6], [10.4, 8.4]])), '#7a5a8a');
      eyes([[9, 10], [11, 10]], '#f8e080');
      break;
    case 'ghost':
      cv.part(P([[4, 17], [4, 9], [6, 5], [10, 3.4], [14, 5], [16, 9], [16, 17], [14, 15.4], [12, 17], [10, 15.4], [8, 17], [6, 15.4]]), '#eef2f8');
      eyes([[8, 8], [12, 8]], '#3b3a5a');
      dot(10, 12, '#3b3a5a');
      break;
    case 'dragon':
      cv.part(Sg(14.5, 15.5, 18.4, 12, 2), '#58b05a');
      cv.part(P([[8, 9], [4, 3.4], [11, 6.6]]), '#e86a4a');
      cv.part(E(11, 14.4, 5, 4), '#58b05a');
      cv.part(E(8, 9, 4.2, 3.6), '#58b05a');
      cv.part(E(11, 15.6, 2.8, 2), '#f2d27a', { rim: false });
      cv.part(any(P([[6, 6], [6.4, 3], [8, 5.8]]), P([[9.6, 5.8], [10.6, 3], [11, 6]])), '#f2d27a');
      eyes([[6, 8], [9, 8]]);
      break;
  }
  if (stage >= 1) {
    const scarf = (x: number, y: number, c: string) => cv.part(any(R(x - 3.4, y - 0.8, x + 3.4, y + 0.8), P([[x + 1, y], [x + 3, y + 3.4], [x + 1.6, y + 3.4]])), c, { rim: false });
    const bow = (x: number, y: number, c: string) => cv.part(any(P([[x, y], [x - 2.6, y - 1.6], [x - 2.6, y + 1.6]]), P([[x, y], [x + 2.6, y - 1.6], [x + 2.6, y + 1.6]])), c, { rim: false });
    switch (kind) {
      case 'chick':
        if (stage === 2) {
          cv.part(any(E(11, 7.6, 1.2, 1.4), E(12.6, 7.9, 1.1, 1.3), E(9.6, 8.2, 1, 1.2)), '#d0443a', { rim: false }); // comb
          cv.part(E(15.2, 15, 0.9, 1.2), '#d0443a', { rim: false }); // wattle
        } else bow(10, 8.6, '#e86a8a');
        break;
      case 'cat':
        cv.part(R(5, 12.2, 11, 13.2), '#d0443a', { rim: false, outline: false });
        cv.part(E(8, 13.8, 1, 1), GOLD, { rim: false });
        break;
      case 'dog':
        scarf(7.6, 12.8, '#d0443a');
        break;
      case 'frog':
        if (stage === 2) cv.part(P([[6.5, 8.2], [6.5, 4.8], [8.2, 6.4], [10, 3.8], [11.8, 6.4], [13.5, 4.8], [13.5, 8.2]]), GOLD);
        else cv.part(any(E(10, 9.6, 3.4, 1.3), Sg(10, 9, 11, 7, 0.8)), '#4a8a3a', { rim: false });
        break;
      case 'owl':
        bow(10, 16.4, '#0099db');
        break;
      case 'fox':
        scarf(7.8, 12.6, '#0099db');
        break;
      case 'slime':
        bow(10, 7.2, '#e86a8a');
        break;
      case 'bat':
        bow(10, 13.6, '#f2b33d');
        break;
      case 'ghost':
        cv.part(any(R(7.6, 1, 12.4, 4), R(6.4, 3.6, 13.6, 4.6)), '#2b2238', { rim: false });
        break;
      case 'dragon':
        scarf(8, 12.4, '#f2b33d');
        break;
    }
  }
  return cv.px;
}

const urls = new Map<string, string>();
const memo = (key: string, make: () => string) => {
  const hit = urls.get(key);
  if (hit !== undefined) return hit;
  const url = make();
  if (url) urls.set(key, url);
  return url;
};

export function heroUrl(look: HeroLook, outfit: Outfit, mood: HeroMood = 'idle'): string {
  return memo(`hero:${JSON.stringify([look, outfit, mood])}`, () => pixelsToUrl(renderHero(look, outfit, { mood }), HERO_W, HERO_H));
}

export function gearIconUrl(art: GearArt): string {
  return memo(`icon:${JSON.stringify(art)}`, () => {
    const { px, size } = cropSquare(renderHero(ICON_LOOK, { [art.slot]: art } as Outfit, { only: art.slot }), HERO_W, HERO_H);
    return pixelsToUrl(px, size, size);
  });
}

export function petUrl(kind: PetKind, stage: PetStage = 0): string {
  return memo(`pet:${kind}:${stage}`, () => pixelsToUrl(renderPet(kind, stage), petSize(stage), petSize(stage)));
}

const ICON_LOOK: HeroLook = { skin: '#efc29a', hair: '#5a3a22', hairStyle: 'none', eyes: '#2b2238' };
