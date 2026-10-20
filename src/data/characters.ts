// The roster: who you fight, how strong they are and how they play. Names, openings and lines come from the
// roster review (artifact "Pawnquest Roster", October 2026). Strength knobs (engineElo, blunderPct, temperament)
// are starting values; calibration will tune them so each character plays like its rating.
import { modelForRating, type ModelId, type Temperament } from '../config';
import type { OpeningId } from './openings';

export type Faction = 'gambiteer' | 'classicist' | 'strategist' | 'neutral' | 'boss';

export interface Character {
  id: string;
  name: string;
  /** The fixed ladder rating shown to the player. */
  rating: number;
  world: WorldId;
  faction: Faction;
  temperament: Temperament;
  /** The Elo given to Maia (a tuning knob; may differ from `rating`). */
  engineElo: number;
  /** Chance (%) of a random legal move instead of Maia's, for the lowest ranks. */
  blunderPct: number;
  /** How many of its own moves the character plays from its book. */
  bookDepth: number;
  /** Fake think time per move, seconds. */
  think: [number, number];
  book: { white: OpeningId[]; vsE4: OpeningId[]; vsD4: OpeningId[] };
  /** The line it says before the game. */
  taunt: string;
  model: ModelId;
}

export type WorldId = 'training' | 'gutter' | 'village' | 'castle' | 'wilds' | 'underworld' | 'throne';

export const WORLDS: { id: WorldId; name: string; blurb: string }[] = [
  { id: 'training', name: 'Training Grounds', blurb: 'Warm up on someone who will not hit back. Much.' },
  { id: 'gutter', name: 'The Gutter', blurb: 'Pickpockets, beggars and rat catchers. Watch your pawns.' },
  { id: 'village', name: 'The Village', blurb: 'Honest folk with tricks up their sleeves.' },
  { id: 'castle', name: 'The Castle', blurb: 'Knights, jesters and spies guard the keep.' },
  { id: 'wilds', name: 'The Wilds', blurb: 'Pirates, druids and dragons beyond the walls.' },
  { id: 'underworld', name: 'The Underworld', blurb: 'Only the bravest come back from here.' },
  { id: 'throne', name: 'The Throne', blurb: 'The Necromancer King waits. He has all the time in the world.' },
];

export const FACTIONS: Record<Faction, { name: string; color: string; accent: string; motto: string }> = {
  gambiteer: { name: 'Gambiteers', color: '#e43b44', accent: '#feae34', motto: 'Fire and sacrifice' },
  classicist: { name: 'Classicists', color: '#0099db', accent: '#c0cbdc', motto: 'Steel and tradition' },
  strategist: { name: 'Strategists', color: '#63c74d', accent: '#ead4aa', motto: 'Stone and patience' },
  neutral: { name: 'Training', color: '#c0cbdc', accent: '#feae34', motto: 'Hay and hope' },
  boss: { name: 'Final boss', color: '#b55088', accent: '#feae34', motto: 'All styles, no mercy' },
};

const THINK: Record<Faction, [number, number]> = {
  gambiteer: [1, 4],
  classicist: [2, 6],
  strategist: [3, 9],
  neutral: [1, 3],
  boss: [3, 10],
};

function worldOf(rating: number): WorldId {
  if (rating < 600) return 'training';
  if (rating < 1000) return 'gutter';
  if (rating < 1400) return 'village';
  if (rating < 1800) return 'castle';
  if (rating < 2200) return 'wilds';
  if (rating < 2500) return 'underworld';
  return 'throne';
}

type Row = [
  id: string,
  name: string,
  rating: number,
  faction: Faction,
  temperament: Temperament,
  bookDepth: number,
  white: OpeningId[],
  vsE4: OpeningId[],
  vsD4: OpeningId[],
  taunt: string,
  extra?: Partial<Character>,
];

const ROWS: Row[] = [
  ['straw-sam', 'Straw Sam the Training Dummy', 400, 'neutral', 'chaotic', 0, [], [], [], "Hit me! I mean... please don't. Or do. I'm made of hay.", { blunderPct: 15 }],

  ['pip', 'Pip the Pickpocket', 600, 'gambiteer', 'chaotic', 4, ['halloween'], ['latvian'], ['englund'], 'Your pawns look heavy. Let me carry a few!', { blunderPct: 6 }],
  ['old-tom', 'Old Tom the Beggar', 600, 'classicist', 'human', 3, ['italian'], ['e5'], ['d5symmetric'], "Spare a pawn for an old man? No? Then I'll take one.", { blunderPct: 6 }],
  ['moss', 'Moss the Hermit', 600, 'strategist', 'steady', 2, ['london'], ['caroKann'], ['slav'], 'Slow and quiet. Like moss on a rock.', { blunderPct: 6 }],

  ['brawling-bess', 'Brawling Bess', 800, 'gambiteer', 'chaotic', 4, ['kingsGambit'], ['elephant'], ['budapest'], 'Put up your fists, sweetpea!', { blunderPct: 2 }],
  ['hobb', 'Hobb the Farmhand', 800, 'classicist', 'human', 4, ['fourKnights'], ['e5'], ['qgd'], "Plant your pieces and watch 'em grow.", { blunderPct: 2 }],
  ['nell', 'Nell the Rat Catcher', 800, 'strategist', 'steady', 4, ['colle'], ['french'], ['slav'], 'I set my traps and wait. The rats always come.', { blunderPct: 2 }],

  ['zed', 'Zed the Fire-Juggler', 1000, 'gambiteer', 'chaotic', 5, ['danish'], ['stafford'], ['albin'], 'Catch! Oops. Too hot to handle?'],
  ['squire-aldric', 'Squire Aldric', 1000, 'classicist', 'human', 5, ['italian'], ['twoKnights'], ['qgd'], "My master says I'm ready. Let's prove him right!"],
  ['grunwald', 'Grunwald the Miller', 1000, 'strategist', 'steady', 5, ['london'], ['pirc'], ['kid'], 'Grind by grind, the flour gets fine.'],

  ['morwen', 'Morwen the Hedge Witch', 1200, 'gambiteer', 'human', 6, ['evans'], ['icelandic'], ['dutchLeningrad'], 'A pinch of chaos, a dash of sacrifice...'],
  ['bram', 'Bram the Blacksmith', 1200, 'classicist', 'human', 6, ['scotch'], ['petroff'], ['qga'], "Strike while the iron's hot!"],
  ['captain-holt', 'Captain Holt of the Guard', 1200, 'strategist', 'steady', 6, ['queensGambit'], ['french'], ['slav'], 'Hold the line. Nobody passes my gate.'],

  ['jester', 'The Jester', 1400, 'gambiteer', 'chaotic', 7, ['friedLiver'], ['traxler'], ['budapest'], "Why so serious? It's only your king!"],
  ['sir-cedric', 'Sir Cedric, Knight Errant', 1400, 'classicist', 'human', 7, ['ruyLopez'], ['openSpanish'], ['qgdOrthodox'], 'Have at thee! Honour demands a fair fight.'],
  ['bishop-anselm', 'Bishop Anselm', 1400, 'strategist', 'steady', 7, ['queensGambit'], ['caroKann'], ['qid'], 'Patience is a virtue. Yours will be tested.'],

  ['vex', 'Vex the Assassin', 1600, 'gambiteer', 'human', 8, ['smithMorra'], ['schliemann'], ['benko'], "You won't see it coming."],
  ['royal-champion', 'The Royal Champion', 1600, 'classicist', 'human', 8, ['ruyClosed'], ['breyer'], ['nimzo'], "The crown sends its best. That's me."],
  ['spymaster', 'The Spymaster', 1600, 'strategist', 'steady', 8, ['english'], ['alekhine'], ['kid'], 'I already know your next move.'],

  ['scarlet', 'Scarlet, Pirate Queen', 1800, 'gambiteer', 'human', 10, ['kingsGambit'], ['dragon'], ['albin'], 'Hand over your treasure, landlubber!'],
  ['thorne', 'Thorne the Ranger', 1800, 'classicist', 'human', 10, ['vienna'], ['petroff'], ['qga'], "I've tracked bigger prey than you."],
  ['oakhart', 'Elder Oakhart, Druid', 1800, 'strategist', 'steady', 10, ['reti'], ['philidor'], ['oldIndian'], 'The forest grows a ring each year. So do I.'],

  ['ignis', 'Ignis the Dragon Tamer', 2000, 'gambiteer', 'human', 12, ['viennaGambit'], ['najdorfPoison'], ['blumenfeld'], "My dragon's hungry. Got any spare rooks?"],
  ['solenne', 'Solenne the Archmage', 2000, 'classicist', 'human', 12, ['queensGambit'], ['chigorin'], ['nimzo'], 'Every move is a spell. Mine are older than yours.'],
  ['frost-giant', 'The Frost Giant', 2000, 'strategist', 'cold', 12, ['qgExchange'], ['french'], ['stonewall'], 'Your attack will freeze. Then shatter.'],

  ['azgar', 'Azgar, Demon General', 2200, 'gambiteer', 'human', 14, ['evans'], ['marshall'], ['modernBenoni'], 'Charge! Burn the board!'],
  ['count-draven', 'Count Draven, Vampire', 2200, 'classicist', 'human', 14, ['ruyLopez'], ['openSpanish'], ['qgdTartakower'], "I've played this game for three hundred years."],
  ['bone-oracle', 'The Bone Oracle', 2200, 'strategist', 'cold', 14, ['english'], ['kan'], ['grunfeld'], 'The bones have spoken. You lose in forty moves.'],

  ['witch-queen', 'The Hellfire Witch-Queen', 2400, 'gambiteer', 'human', 16, ['kingsGambit', 'viennaGambit'], ['najdorfSveshnikov'], ['benko', 'budapest'], 'Kneel, or burn. Your choice.'],
  ['death-knight', 'The Death Knight', 2400, 'classicist', 'human', 16, ['ruyLopez', 'italian'], ['berlin'], ['qgdRagozin'], 'I do not tire. I do not blunder. I do not stop.'],
  ['lich', 'The Lich', 2400, 'strategist', 'cold', 16, ['catalan'], ['caroKann'], ['nimzoQid'], 'Time means nothing to me. I can wait.', { think: [5, 14] }],

  ['necromancer-king', 'The Necromancer King', 2500, 'boss', 'cold', 18, ['kingsGambit', 'ruyLopez', 'catalan'], ['najdorfSveshnikov', 'berlin', 'caroKann'], ['benko', 'qgdRagozin', 'nimzoQid'], 'Every champion you beat now serves me. Come, join them.'],
];

export const CHARACTERS: Character[] = ROWS.map(([id, name, rating, faction, temperament, bookDepth, white, vsE4, vsD4, taunt, extra]) => ({
  id,
  name,
  rating,
  world: worldOf(rating),
  faction,
  temperament,
  engineElo: Math.max(600, rating),
  blunderPct: 0,
  bookDepth,
  think: THINK[faction],
  book: { white, vsE4, vsD4 },
  taunt,
  model: modelForRating(rating),
  ...extra,
}));

export const characterById = (id: string) => CHARACTERS.find((c) => c.id === id);

/** A short name for tight places: "Pip the Pickpocket" → "Pip", "Sir Cedric, Knight Errant" → "Sir Cedric", "The Lich" → "Lich". */
export const shortName = (name: string) => name.replace(/^The /, '').split(/,| the /)[0].split(' ').slice(0, 2).join(' ');

/** Short reactions during the game, per faction (family-friendly). */
export const REACTIONS: Record<Faction, Record<'capture' | 'check' | 'losing' | 'win' | 'loss' | 'draw', string[]>> = {
  gambiteer: {
    capture: ['Mine now!', 'Ooh, shiny.', 'Into the fire!'],
    check: ['Knock knock!', 'Run, little king!'],
    losing: ['This is fine. Totally fine.', 'I meant to do that!'],
    win: ['Burned to a crisp!', 'Too hot for you?'],
    loss: ['Fine. You win this round.', 'Next time, I bring more fire.'],
    draw: ['A truce? Boring... but fine.'],
  },
  classicist: {
    capture: ['A fair trade.', 'By the book.'],
    check: ['Check, if you please.', 'Mind your king.'],
    losing: ['Hmm. Most irregular.', 'I must consult my books.'],
    win: ['Well played, but the classics win.', 'Good game. Study the openings!'],
    loss: ['Well played. I bow to you.', 'A worthy victory.'],
    draw: ['Honours even.'],
  },
  strategist: {
    capture: ['As planned.', 'One step closer.'],
    check: ['The net tightens.', 'Check.'],
    losing: ['An interesting position.', 'I did not foresee this.'],
    win: ['Patience always wins.', 'Slowly, then all at once.'],
    loss: ['You out-planned me. Impressive.', 'I will study this game.'],
    draw: ['A balanced result.'],
  },
  neutral: {
    capture: ['Ow! My hay!', 'Hey, that was mine!'],
    check: ['Did I do that?'],
    losing: ['I am losing my stuffing!'],
    win: ['I... won? Somebody write this down!'],
    loss: ['Great hit! Ready for the real fights?'],
    draw: ['Nobody wins? Nobody loses? I like it.'],
  },
  boss: {
    capture: ['Another soul for my army.', 'Yours is mine.'],
    check: ['Kneel.', 'Your king trembles.'],
    losing: ['Impossible...', 'You dare?'],
    win: ['Join my army of the fallen.', 'As it was always going to be.'],
    loss: ['No... NO! You have broken my reign!', 'A new ruler... the board is yours.'],
    draw: ['We will meet again.'],
  },
};
