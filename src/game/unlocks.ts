// Everything the player can unlock, derived from the game history alone (so an imported save, or a game played
// on another version, unlocks the same things): gear from first wins, and quests that give boards, piece sets,
// pets, gear and titles. Quests reward how a player plays and learns (good habits, games played, reviews), not
// only winning; nothing expires and nothing is taken away.
import { characterById } from '../data/characters';
import { ITEMS, type Item } from '../data/gear';
import type { BoardThemeId } from '../ui/boards';
import type { PetKind } from '../ui/hero';
import type { PieceSetId } from '../ui/pieces';
import { replay } from './chess';
import { countsAsGame, crownFor, ownMoves, type GameRecord } from './progress';

export type Reward =
  | { kind: 'board'; id: BoardThemeId }
  | { kind: 'pieces'; id: PieceSetId }
  | { kind: 'pet'; id: PetKind }
  | { kind: 'item'; id: string }
  | { kind: 'title'; id: string };

export type QuestGroup = 'habits' | 'journey' | 'study' | 'conquest';
export const QUEST_GROUPS: { id: QuestGroup; name: string; blurb: string }[] = [
  { id: 'habits', name: 'Good habits', blurb: 'Think first, check for blunders, keep fighting, try something new.' },
  { id: 'journey', name: 'The road', blurb: 'Every game counts, win or lose.' },
  { id: 'study', name: 'Study', blurb: 'Look back at your games and get better.' },
  { id: 'conquest', name: 'Conquest', blurb: 'Wins, crowns and ratings.' },
];

export interface Progress {
  /** Rated games only, oldest first. */
  history: readonly GameRecord[];
  /** How many games have been reviewed. */
  reviews: number;
  peak: number;
}

export interface Quest {
  id: string;
  group: QuestGroup;
  title: string;
  text: string;
  rewards: Reward[];
  /** [done so far, needed]. */
  progress(p: Progress): [number, number];
  /** Only listed when this says so (the habit breakers show once the mistake is yours to break). */
  shown?(p: Progress): boolean;
}

const wins = (h: readonly GameRecord[]) => h.filter((g) => g.score === 1);
const ownMoveCount = (g: GameRecord) => ownMoves(g).length;
const reviewed = (h: readonly GameRecord[]) => h.filter((g) => g.review);
const played = (h: readonly GameRecord[]) => h.filter(countsAsGame).length;

/** The material left at the end: a lone king against king and one queen (or rook), checkmated by the player. */
function matedWith(g: GameRecord, role: 'queen' | 'rook'): boolean {
  if (g.score !== 1 || g.termination !== 'checkmate') return false;
  let pos;
  try {
    pos = replay(g.moves, g.startFen).pos;
  } catch {
    return false;
  }
  const b = pos.board;
  const me = b[g.color];
  const them = b[g.color === 'white' ? 'black' : 'white'];
  const pieces = (side: typeof me, r: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen') => b[r].intersect(side).size();
  const lone = them.size() === 1;
  const others = (['pawn', 'knight', 'bishop', 'rook', 'queen'] as const).filter((r) => r !== role).every((r) => pieces(me, r) === 0);
  return lone && others && pieces(me, role) === 1;
}

/** After three losses in a row, the next game started at least 15 minutes after the third. */
function tookABreather(h: readonly GameRecord[]): boolean {
  for (let i = 3; i < h.length; i++) {
    const run = h.slice(i - 3, i);
    if (!run.every((g) => g.score === 0)) continue;
    const next = h[i].startedAt;
    if (next && Date.parse(next) - Date.parse(run[2].date) >= 15 * 60_000) return true;
  }
  return false;
}

/** As White: the number of different first moves played in at least 3 games each. */
function firstMovesExplored(h: readonly GameRecord[]): number {
  const n = new Map<string, number>();
  for (const g of h) if (g.color === 'white' && !g.startFen && g.moves[0] && countsAsGame(g)) n.set(g.moves[0], (n.get(g.moves[0]) ?? 0) + 1);
  return [...n.values()].filter((v) => v >= 3).length;
}

/** Habit breaker: in how many of a window of reviewed games a mistake kind appears. */
function kindShare(h: readonly GameRecord[], kinds: string[]): { before: number; recent: number; ready: boolean } {
  const r = reviewed(h);
  const has = (g: GameRecord) => g.review!.kinds.some((k) => kinds.includes(k));
  const recent = r.slice(-10);
  const before = r.slice(-20, -10);
  return { before: before.filter(has).length, recent: recent.filter(has).length, ready: before.length === 10 };
}
const habitBreaker = (id: string, kinds: string[], title: string, mistake: string): Quest => ({
  id: `break-${id}`,
  group: 'study',
  title: `Break the habit: ${mistake}`,
  text: `Make "${mistake}" at least twice as rare in your last 10 reviewed games as in the 10 before.`,
  rewards: [{ kind: 'title', id: title }],
  progress: (p) => {
    const k = kindShare(p.history, kinds);
    return count(k.ready && k.before >= 2 && k.recent * 2 <= k.before ? 1 : 0, 1);
  },
  shown: (p) => kindShare(p.history, kinds).before >= 2 || reviewed(p.history).some((g) => g.review!.kinds.some((x) => kinds.includes(x))),
});
const distinctWinsOf = (h: readonly GameRecord[], faction: string) => new Set(wins(h).filter((g) => g.faction === faction).map((g) => g.characterId)).size;
const count = (n: number, of: number): [number, number] => [Math.min(n, of), of];

export const QUESTS: Quest[] = [
  { group: 'journey', id: 'first-game', title: 'First steps', text: 'Play your first game.', rewards: [{ kind: 'pet', id: 'chick' }], progress: (p) => count(p.history.length, 1) },
  { group: 'conquest', id: 'first-win', title: 'First victory', text: 'Win a game.', rewards: [{ kind: 'board', id: 'wood' }], progress: (p) => count(wins(p.history).length, 1) },
  { group: 'conquest', id: 'draw', title: 'Peacemaker', text: 'Draw a game.', rewards: [{ kind: 'pet', id: 'cat' }], progress: (p) => count(p.history.filter((g) => g.score === 0.5).length, 1) },
  { group: 'study', id: 'reviews', title: 'Learn from it', text: 'Review 3 of your games.', rewards: [{ kind: 'pet', id: 'owl' }], progress: (p) => count(p.reviews, 3) },
  { group: 'conquest', id: 'mates', title: 'Checkmate!', text: 'Win 3 games by checkmate.', rewards: [{ kind: 'pieces', id: 'woodland' }], progress: (p) => count(wins(p.history).filter((g) => g.termination === 'checkmate').length, 3) },
  { group: 'conquest', id: 'black-wins', title: 'Dark horse', text: 'Win 3 games with Black.', rewards: [{ kind: 'board', id: 'cobble' }], progress: (p) => count(wins(p.history).filter((g) => g.color === 'black').length, 3) },
  { group: 'conquest', id: 'quick-win', title: 'Swift strike', text: 'Win in 25 moves or fewer.', rewards: [{ kind: 'pet', id: 'frog' }], progress: (p) => count(wins(p.history).filter((g) => ownMoveCount(g) <= 25).length, 1) },
  { group: 'conquest', id: 'promote', title: 'From pawn to queen', text: 'Promote a pawn and win the game.', rewards: [{ kind: 'pet', id: 'slime' }], progress: (p) => count(wins(p.history).filter((g) => ownMoves(g).some((m) => m.length === 5)).length, 1) },
  { group: 'conquest', id: 'gambiteers', title: 'Fire walker', text: 'Beat 3 different Gambiteers.', rewards: [{ kind: 'pet', id: 'fox' }], progress: (p) => count(distinctWinsOf(p.history, 'gambiteer'), 3) },
  { group: 'conquest', id: 'classicists', title: 'Steel breaker', text: 'Beat 3 different Classicists.', rewards: [{ kind: 'board', id: 'stone' }], progress: (p) => count(distinctWinsOf(p.history, 'classicist'), 3) },
  { group: 'conquest', id: 'strategists', title: 'Stone mover', text: 'Beat 3 different Strategists.', rewards: [{ kind: 'board', id: 'forest' }], progress: (p) => count(distinctWinsOf(p.history, 'strategist'), 3) },
  { group: 'conquest', id: 'wins-10', title: 'Seasoned', text: 'Win 10 games.', rewards: [{ kind: 'pieces', id: 'ivory' }], progress: (p) => count(wins(p.history).length, 10) },
  { group: 'conquest', id: 'wins-25', title: 'Veteran', text: 'Win 25 games.', rewards: [{ kind: 'pieces', id: 'royal' }], progress: (p) => count(wins(p.history).length, 25) },
  { group: 'conquest', id: 'long-win', title: 'Endgame grinder', text: 'Win a game of 60 moves or more.', rewards: [{ kind: 'pieces', id: 'frost' }], progress: (p) => count(wins(p.history).filter((g) => ownMoveCount(g) >= 60).length, 1) },
  { group: 'conquest', id: 'rating-800', title: 'On the road', text: 'Reach a rating of 800.', rewards: [{ kind: 'pet', id: 'dog' }], progress: (p) => count(p.peak >= 800 ? 1 : 0, 1) },
  { group: 'conquest', id: 'gold-crown', title: 'Golden', text: 'Earn a gold crown (5 wins against one opponent).', rewards: [{ kind: 'pieces', id: 'ember' }], progress: (p) => count(goldCrowns(p.history), 1) },
  { group: 'conquest', id: 'rating-1200', title: 'Village hero', text: 'Reach a rating of 1200.', rewards: [{ kind: 'pieces', id: 'jade' }], progress: (p) => count(p.peak >= 1200 ? 1 : 0, 1) },
  { group: 'conquest', id: 'rating-1600', title: 'Knight of the realm', text: 'Reach a rating of 1600.', rewards: [{ kind: 'board', id: 'marble' }], progress: (p) => count(p.peak >= 1600 ? 1 : 0, 1) },
  { group: 'conquest', id: 'rating-2000', title: 'Dragon friend', text: 'Reach a rating of 2000.', rewards: [{ kind: 'pet', id: 'dragon' }], progress: (p) => count(p.peak >= 2000 ? 1 : 0, 1) },
  { group: 'conquest', id: 'underworld', title: 'Into the dark', text: 'Beat anyone in the Underworld.', rewards: [{ kind: 'board', id: 'obsidian' }], progress: (p) => count(wins(p.history).filter((g) => characterById(g.characterId)?.world === 'underworld').length, 1) },
  { group: 'conquest', id: 'boss', title: 'The crown falls', text: 'Beat the Necromancer King.', rewards: [{ kind: 'pet', id: 'ghost' }], progress: (p) => count(wins(p.history).filter((g) => g.characterId === 'necromancer-king').length, 1) },
  { group: 'conquest', id: 'all-rivals', title: 'Legend', text: 'Beat every opponent at least once.', rewards: [{ kind: 'pet', id: 'bat' }], progress: (p) => count(new Set(wins(p.history).map((g) => g.characterId)).size, 32) },

  // Good habits.
  { group: 'habits', id: 'think-first', title: 'Think first', text: 'In 5 games of 30 moves or more, use at least 5 of your 15 minutes.', rewards: [{ kind: 'title', id: 'patient' }, { kind: 'item', id: 'hourglass' }], progress: (p) => count(p.history.filter((g) => ownMoveCount(g) >= 30 && (g.timeUsedMs ?? 0) >= 5 * 60_000).length, 5) },
  { group: 'habits', id: 'clean-game', title: 'Clean game', text: 'Play a game without a single blunder (win or lose), and review it.', rewards: [{ kind: 'title', id: 'careful' }], progress: (p) => count(reviewed(p.history).filter((g) => g.review!.blunders === 0 && ownMoveCount(g) >= 15).length, 1) },
  { group: 'habits', id: 'spotless', title: 'Spotless', text: 'Review 5 games without a blunder.', rewards: [{ kind: 'pieces', id: 'parchment' }], progress: (p) => count(reviewed(p.history).filter((g) => g.review!.blunders === 0 && ownMoveCount(g) >= 15).length, 5) },
  { group: 'habits', id: 'lesson-learned', title: 'Lesson learned', text: 'Review 5 games you lost.', rewards: [{ kind: 'item', id: 'scholar-quill' }], progress: (p) => count(reviewed(p.history).filter((g) => g.score === 0).length, 5) },
  { group: 'habits', id: 'never-give-up', title: 'Never give up', text: 'Draw or win a game after your winning chance fell below 20% (shows after its review).', rewards: [{ kind: 'title', id: 'unbroken' }, { kind: 'item', id: 'phoenix-feather' }], progress: (p) => count(reviewed(p.history).filter((g) => g.score >= 0.5 && g.review!.minWinPct < 20).length, 1) },
  { group: 'habits', id: 'finish-the-job', title: 'Finish the job', text: 'Checkmate a lone king with king and queen.', rewards: [{ kind: 'title', id: 'finisher' }], progress: (p) => count(p.history.filter((g) => matedWith(g, 'queen')).length, 1) },
  { group: 'habits', id: 'mate-maker', title: 'Mate maker', text: 'Checkmate a lone king with king and rook.', rewards: [{ kind: 'title', id: 'mate-maker' }], progress: (p) => count(p.history.filter((g) => matedWith(g, 'rook')).length, 1) },
  { group: 'habits', id: 'bold', title: 'Bold challenger', text: 'Pick 3 fights on the map against someone 200 or more above you, win or lose.', rewards: [{ kind: 'title', id: 'bold' }], progress: (p) => count(p.history.filter((g) => !g.auto && countsAsGame(g) && g.opponentRating - g.ratingBefore >= 200).length, 3) },
  { group: 'habits', id: 'breather', title: 'Take a breather', text: 'After 3 losses in a row, take a break of at least 15 minutes before the next game.', rewards: [{ kind: 'item', id: 'cozy-beanie' }], progress: (p) => count(tookABreather(p.history) ? 1 : 0, 1) },
  { group: 'habits', id: 'explorer', title: 'Explorer', text: 'As White, play 3 games each with three different first moves (like 1.e4, 1.d4 and 1.c4).', rewards: [{ kind: 'title', id: 'explorer' }, { kind: 'item', id: 'compass' }], progress: (p) => count(firstMovesExplored(p.history), 3) },
  // The road: games played, win or lose (at least 10 of your own moves, or decided on the board).
  { group: 'journey', id: 'games-5', title: 'On the road', text: 'Play 5 games.', rewards: [{ kind: 'title', id: 'wanderer' }], progress: (p) => count(played(p.history), 5) },
  { group: 'journey', id: 'games-10', title: 'Campfire tales', text: 'Play 10 games.', rewards: [{ kind: 'board', id: 'campfire' }], progress: (p) => count(played(p.history), 10) },
  { group: 'journey', id: 'games-25', title: 'Well travelled', text: 'Play 25 games.', rewards: [{ kind: 'item', id: 'travellers-cloak' }], progress: (p) => count(played(p.history), 25) },
  { group: 'journey', id: 'games-50', title: 'Half a hundred', text: 'Play 50 games.', rewards: [{ kind: 'pieces', id: 'moonlight' }], progress: (p) => count(played(p.history), 50) },
  { group: 'journey', id: 'games-100', title: 'The hundredth game', text: 'Play 100 games.', rewards: [{ kind: 'item', id: 'golden-pawn' }, { kind: 'title', id: 'tireless' }], progress: (p) => count(played(p.history), 100) },
  { group: 'journey', id: 'games-250', title: 'Seasoned road', text: 'Play 250 games.', rewards: [{ kind: 'board', id: 'starfall' }], progress: (p) => count(played(p.history), 250) },
  { group: 'journey', id: 'games-500', title: 'Legend of the road', text: 'Play 500 games.', rewards: [{ kind: 'item', id: 'heros-mantle' }, { kind: 'title', id: 'legend-road' }], progress: (p) => count(played(p.history), 500) },
  // Study: reviews.
  { group: 'study', id: 'reviews-1', title: 'First look back', text: 'Review a game.', rewards: [{ kind: 'title', id: 'curious' }], progress: (p) => count(p.reviews, 1) },
  { group: 'study', id: 'reviews-10', title: 'Bookworm', text: 'Review 10 games.', rewards: [{ kind: 'item', id: 'candle' }], progress: (p) => count(p.reviews, 10) },
  { group: 'study', id: 'reviews-25', title: 'Scholar', text: 'Review 25 games.', rewards: [{ kind: 'item', id: 'scholars-hood' }, { kind: 'board', id: 'library' }], progress: (p) => count(p.reviews, 25) },
  { group: 'study', id: 'reviews-50', title: 'Sage', text: 'Review 50 games.', rewards: [{ kind: 'pieces', id: 'ink' }], progress: (p) => count(p.reviews, 50) },
  { group: 'study', id: 'reviews-100', title: 'Grandmaster’s Tome', text: 'Review 100 games.', rewards: [{ kind: 'item', id: 'grandmasters-tome' }, { kind: 'title', id: 'wise-owl' }], progress: (p) => count(p.reviews, 100) },
  { group: 'study', id: 'review-wins', title: 'Even winners look back', text: 'Review 3 games you won.', rewards: [{ kind: 'title', id: 'thorough' }], progress: (p) => count(reviewed(p.history).filter((g) => g.score === 1).length, 3) },
  habitBreaker('hanging', ['Hanging piece'], 'guardian-pieces', 'Hanging piece'),
  habitBreaker('allowed-mate', ['Allowed mate'], 'kings-shield', 'Allowed mate'),
  habitBreaker('missed-mate', ['Missed mate'], 'mate-spotter', 'Missed mate'),
  habitBreaker('allowed-fork', ['Allowed a fork'], 'fork-dodger', 'Allowed a fork'),
  habitBreaker('missed-fork', ['Missed a fork'], 'fork-finder', 'Missed a fork'),
  habitBreaker('allowed-pin', ['Allowed a pin'], 'pin-breaker', 'Allowed a pin'),
  habitBreaker('missed-pin', ['Missed a pin'], 'pin-master', 'Missed a pin'),
  habitBreaker('missed-capture', ['Missed a capture'], 'sharp-eye', 'Missed a capture'),
  habitBreaker('missed-threat', ['Missed a threat'], 'watchtower', 'Missed a threat'),
  habitBreaker('missed-win', ['Missed a win'], 'closer', 'Missed a win'),
];

function goldCrowns(h: readonly GameRecord[]): number {
  const byChar = new Map<string, number>();
  for (const g of wins(h)) byChar.set(g.characterId, (byChar.get(g.characterId) ?? 0) + 1);
  return [...byChar.values()].filter((n) => crownFor(n) === 'gold').length;
}

export const questDone = (q: Quest, p: Progress) => {
  const [n, of] = q.progress(p);
  return n >= of;
};

export interface Unlocks {
  titles: Set<string>;
  items: Set<string>;
  boards: Set<BoardThemeId>;
  pieces: Set<PieceSetId>;
  pets: Set<PetKind>;
  quests: Set<string>;
}

export function unlocks(p: Progress): Unlocks {
  const beaten = new Set(wins(p.history).map((g) => g.characterId));
  const u: Unlocks = {
    titles: new Set<string>(),
    items: new Set(ITEMS.filter((i) => (!i.from && !i.quest) || (i.from && beaten.has(i.from))).map((i) => i.id)),
    boards: new Set<BoardThemeId>(['meadow']),
    pieces: new Set<PieceSetId>(['classic']),
    pets: new Set<PetKind>(),
    quests: new Set<string>(),
  };
  for (const q of QUESTS) {
    if (!questDone(q, p)) continue;
    u.quests.add(q.id);
    for (const r of q.rewards) {
      if (r.kind === 'board') u.boards.add(r.id);
      else if (r.kind === 'pieces') u.pieces.add(r.id);
      else if (r.kind === 'pet') u.pets.add(r.id);
      else if (r.kind === 'item') u.items.add(r.id);
      else u.titles.add(r.id);
    }
  }
  return u;
}

/** What a finished game unlocked: new gear and newly completed quests. */
export function newUnlocks(before: Progress, after: Progress): { items: Item[]; quests: Quest[] } {
  const a = unlocks(before);
  const b = unlocks(after);
  return { items: ITEMS.filter((i) => b.items.has(i.id) && !a.items.has(i.id)), quests: QUESTS.filter((q) => b.quests.has(q.id) && !a.quests.has(q.id)) };
}
