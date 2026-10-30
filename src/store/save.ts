// Everything the player owns, kept on this device (IndexedDB) and nowhere else: rating, history, XP,
// settings and the game in progress. A save file can be exported and imported.
import { create } from 'zustand';
import { createStore, get, set } from 'idb-keyval';
import { CLOCK, RATING, XP } from '../config';
import { characterById } from '../data/characters';
import type { Side } from '../game/chess';
import { newClock, timeLeft, type ClockState } from '../game/clock';
import { characterRecord, xpForGame, type GameRecord } from '../game/progress';
import { ratedGames, ratingDelta } from '../game/rating';
import type { Result } from '../game/rules';
import type { GameReview } from '../review/analyse';
import type { BoardThemeId } from '../ui/boards';
import type { Hero } from '../data/gear';
import type { Slot } from '../ui/hero';
import type { PieceSetId } from '../ui/pieces';
import { newUnlocks, type Progress } from '../game/unlocks';
import { summarizeReview } from '../review/summary';
import { habitChips } from '../game/habits';
import { petStage } from '../game/pets';
import { puzzleCounts, puzzlesFrom, type Puzzle, type PuzzleTry } from '../review/puzzles';

export interface ActiveGame {
  id: string;
  characterId: string;
  color: Side;
  moves: string[];
  clock: ClockState;
  auto: boolean;
  /** The bot's winning chance before each of its moves (for resigning). */
  botWinChances: number[];
  /** Ply at which the player last offered a draw (one offer per few moves). */
  drawOfferPly: number | null;
  startedAt: string;
  /** "Try again": the game starts from this position, is not rated and is not kept in the history. */
  startFen?: string;
  practice?: boolean;
}

export interface Settings {
  sound: boolean;
  /** Screen shake, ambient particles and other motion; also off when the system asks for reduced motion. */
  motion: boolean;
  /** 'region': each region's own board; otherwise always this one. */
  boardTheme: 'region' | BoardThemeId;
  pieceSet: PieceSetId;
  /** Background music per region, and its volume (0–1). */
  music: boolean;
  musicVolume: number;
  /** The effect after a win: 'auto' = the newest one unlocked, 'none', or one by id. */
  victoryEffect: string;
}

export interface SaveData {
  version: 1;
  rating: number;
  peak: number;
  xp: number;
  history: GameRecord[];
  active: ActiveGame | null;
  settings: Settings;
  /** Game reviews by game id (kept for the most recent games). */
  reviews: Record<string, GameReview>;
  /** The player's own character (null until it is made). */
  hero: Hero | null;
  /** The puzzle book: better moves from reviews, and how each attempt went. */
  puzzles: Puzzle[];
  puzzleLog: Record<string, PuzzleTry>;
  /** When this save was started over or loaded from a file (it then replaces older saves on other devices). */
  epoch?: string;
  /** When the hero was last changed (the newest one wins when devices sync). */
  heroAt?: string;
  /** Games already sent to the Repertoire app (by id). */
  sent?: string[];
}

export const NEW_SAVE: SaveData = {
  version: 1,
  rating: RATING.start,
  peak: RATING.start,
  xp: 0,
  history: [],
  active: null,
  settings: { sound: true, motion: true, boardTheme: 'region', pieceSet: 'classic', music: true, musicVolume: 0.35, victoryEffect: 'auto' },
  reviews: {},
  hero: null,
  puzzles: [],
  puzzleLog: {},
};

/** Reviews kept per save (the oldest are dropped). */
const MAX_REVIEWS = 50;

interface Store extends SaveData {
  loaded: boolean;
  /** Quests a review just completed (shown on the review screen). */
  reviewUnlocks: { gameId: string; quests: string[] } | null;
  /** The last finished game, for the result screen. */
  lastResult: { record: GameRecord; xpGained: number; crownEarned: boolean; newItems: string[]; newQuests: string[]; chips: string[]; petGrew?: 1 | 2 } | null;
  startGame(characterId: string, color: Side, auto: boolean, opts?: { startFen?: string; practice?: boolean }): void;
  setReview(gameId: string, review: GameReview): void;
  /** Records a puzzle attempt; returns the quests it completed. */
  logPuzzle(id: string, solved: boolean, firstTry: boolean): string[];
  updateActive(patch: Partial<ActiveGame>): void;
  finishGame(result: Result): void;
  abandonActive(): void;
  setSettings(patch: Partial<Settings>): void;
  setHero(hero: Hero): void;
  equip(slot: Slot | 'pet', id: string | null): void;
  importSave(json: string): void;
  resetAll(): void;
}

const firstMover = (g: GameRecord): Side => (g.startFen ? (g.startFen.split(' ')[1] === 'b' ? 'black' : 'white') : 'white');

/** The player's clock time used in a game (15 minutes plus increments, minus what is left). */
function timeUsed(a: ActiveGame, now: number): number {
  const own = a.moves.filter((_, i) => (i % 2 === 0) === (a.color === firstMover({ startFen: a.startFen } as GameRecord))).length;
  const timed = Math.max(0, own - (a.color === 'white' && !a.startFen ? 1 : 0)); // White's first move starts the clock
  return Math.max(0, CLOCK.minutes * 60_000 + timed * CLOCK.incrementSeconds * 1000 - timeLeft(a.clock, a.color, now));
}

/** Old saves: summarise reviews that were stored before summaries existed, and fill the puzzle book from them. */
function withSummaries(d: SaveData): SaveData {
  let out = d;
  if (d.history.some((g) => !g.review && d.reviews[g.id])) out = { ...out, history: d.history.map((g) => (!g.review && d.reviews[g.id] ? { ...g, review: summarizeReview(d.reviews[g.id], firstMover(g)) } : g)) };
  const known = new Set(out.puzzles.map((p) => p.gameId));
  const missing = out.history.filter((g) => !known.has(g.id) && out.reviews[g.id]);
  if (missing.length) out = { ...out, puzzles: [...out.puzzles, ...missing.flatMap((g) => puzzlesFrom(out.reviews[g.id], g))] };
  return out;
}

/** Puzzles kept per save (the oldest unsolved ones are dropped first). */
const MAX_PUZZLES = 500;
function addPuzzles(list: Puzzle[], add: Puzzle[], log: Record<string, PuzzleTry>): Puzzle[] {
  const ids = new Set(list.map((p) => p.id));
  const all = [...list, ...add.filter((p) => !ids.has(p.id))];
  if (all.length <= MAX_PUZZLES) return all;
  const drop = new Set(all.filter((p) => !log[p.id]?.solved).slice(0, all.length - MAX_PUZZLES).map((p) => p.id));
  return all.filter((p) => !drop.has(p.id));
}

const db = typeof indexedDB !== 'undefined' ? createStore('pawnquest', 'save') : undefined;
const KEY = 'save-v1';

const pickSave = (s: Store): SaveData => ({ version: 1, rating: s.rating, peak: s.peak, xp: s.xp, history: s.history, active: s.active, settings: s.settings, reviews: s.reviews, hero: s.hero, puzzles: s.puzzles, puzzleLog: s.puzzleLog, epoch: s.epoch, heroAt: s.heroAt, sent: s.sent });

/** What the unlocks are computed from. */
export const progressOf = (s: Pick<SaveData, 'history' | 'peak'> & { puzzleLog?: Record<string, PuzzleTry> }): Progress => ({
  history: s.history,
  reviews: s.history.filter((g) => g.review).length,
  peak: s.peak,
  puzzles: puzzleCounts(s.puzzleLog ?? {}),
});

export const useSave = create<Store>()((setState, getState) => ({
  ...NEW_SAVE,
  loaded: false,
  reviewUnlocks: null,
  lastResult: null,

  startGame(characterId, color, auto, opts) {
    setState({
      active: {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        characterId,
        color,
        moves: [],
        clock: newClock({ minutes: CLOCK.minutes, increment: CLOCK.incrementSeconds }),
        auto,
        botWinChances: [],
        drawOfferPly: null,
        startedAt: new Date().toISOString(),
        ...(opts?.startFen ? { startFen: opts.startFen } : {}),
        ...(opts?.practice ? { practice: true } : {}),
      },
      lastResult: null,
    });
  },

  updateActive(patch) {
    const a = getState().active;
    if (a) setState({ active: { ...a, ...patch } });
  },

  finishGame(result) {
    const s = getState();
    const a = s.active;
    const c = a && characterById(a.characterId);
    if (!a || !c) return;
    const score = result.winner === null ? 0.5 : result.winner === a.color ? 1 : 0;
    const delta = a.practice ? 0 : ratingDelta(s.rating, c.rating, score, ratedGames(s.history));
    const record: GameRecord = {
      id: a.id,
      characterId: c.id,
      faction: c.faction,
      opponentRating: c.rating,
      color: a.color,
      moves: a.moves,
      winner: result.winner,
      termination: result.termination,
      score,
      ratingBefore: s.rating,
      ratingAfter: s.rating + delta,
      date: new Date().toISOString(),
      auto: a.auto,
      startedAt: a.startedAt,
      timeUsedMs: timeUsed(a, Date.now()),
      pet: s.hero?.pet ?? null,
      ...(a.startFen ? { startFen: a.startFen } : {}),
      ...(a.practice ? { practice: true } : {}),
    };
    if (a.practice) {
      setState({ active: null, lastResult: { record, xpGained: 0, crownEarned: false, newItems: [], newQuests: [], chips: [] } });
      return;
    }
    const crownBefore = characterRecord(s.history, c.id).crown;
    const history = [...s.history, record];
    const crownAfter = characterRecord(history, c.id).crown;
    const chips = habitChips(record, s.history);
    const xpGained = xpForGame(score, crownBefore, crownAfter) + chips.length * XP.habit;
    const peak = Math.max(s.peak, record.ratingAfter);
    const fresh = newUnlocks(progressOf(s), progressOf({ history, peak, puzzleLog: s.puzzleLog }));
    setState({
      history,
      rating: record.ratingAfter,
      peak,
      xp: s.xp + xpGained,
      active: null,
      lastResult: {
        record,
        xpGained,
        crownEarned: crownAfter !== crownBefore,
        newItems: fresh.items.map((i) => i.id),
        newQuests: fresh.quests.map((q) => q.id),
        chips,
        petGrew: record.pet && petStage(history, record.pet) > petStage(s.history, record.pet) ? (petStage(history, record.pet) as 1 | 2) : undefined,
      },
    });
  },

  setReview(gameId, review) {
    const s = getState();
    const keep = new Set(s.history.slice(-MAX_REVIEWS).map((g) => g.id));
    const reviews = Object.fromEntries(Object.entries({ ...s.reviews, [gameId]: review }).filter(([id]) => keep.has(id) || id === gameId));
    // The summary stays on the game record, so quests keep counting it after the full review is pruned.
    const before = progressOf(s);
    const history = s.history.map((g) => (g.id === gameId ? { ...g, review: summarizeReview(review, firstMover(g)) } : g));
    const fresh = newUnlocks(before, progressOf({ history, peak: s.peak, puzzleLog: s.puzzleLog }));
    const game = history.find((g) => g.id === gameId);
    const puzzles = game ? addPuzzles(s.puzzles, puzzlesFrom(review, game), s.puzzleLog) : s.puzzles;
    setState({ reviews, history, puzzles, reviewUnlocks: { gameId, quests: fresh.quests.map((q) => q.id) } });
  },

  logPuzzle(id, solved, firstTry) {
    const s = getState();
    const was = s.puzzleLog[id];
    if (was?.solved && (was.firstTry || !firstTry)) return [];
    const puzzleLog = { ...s.puzzleLog, [id]: { solved: solved || !!was?.solved, firstTry: firstTry || !!was?.firstTry, date: new Date().toISOString() } };
    const fresh = newUnlocks(progressOf(s), progressOf({ ...s, puzzleLog }));
    const xp = solved && !was?.solved ? XP.puzzle : 0;
    setState({ puzzleLog, xp: s.xp + xp });
    return fresh.quests.map((q) => q.id);
  },

  abandonActive() {
    setState({ active: null });
  },

  setSettings(patch) {
    setState({ settings: { ...getState().settings, ...patch } });
  },

  setHero(hero) {
    setState({ hero, heroAt: new Date().toISOString() });
  },

  equip(slot, id) {
    const h = getState().hero;
    if (!h) return;
    const heroAt = new Date().toISOString();
    if (slot === 'pet') setState({ hero: { ...h, pet: id as Hero['pet'] }, heroAt });
    else setState({ hero: { ...h, equip: { ...h.equip, [slot]: id } }, heroAt });
  },

  importSave(json) {
    const data = parseSave(json);
    setState({ ...data, lastResult: null, epoch: new Date().toISOString() });
  },

  resetAll() {
    setState({ ...NEW_SAVE, lastResult: null, epoch: new Date().toISOString(), heroAt: undefined });
  },
}));

/** Checks a save file before it replaces anything; throws a readable error. */
export function parseSave(json: string): SaveData {
  let d: Partial<SaveData>;
  try {
    d = JSON.parse(json);
  } catch {
    throw new Error('This is not a Pawnquest save file.');
  }
  if (!d || d.version !== 1 || typeof d.rating !== 'number' || !Array.isArray(d.history)) throw new Error('This is not a Pawnquest save file.');
  return withSummaries({ ...NEW_SAVE, ...d, settings: { ...NEW_SAVE.settings, ...(d.settings ?? {}) }, reviews: d.reviews ?? {}, hero: d.hero ?? null, puzzles: d.puzzles ?? [], puzzleLog: d.puzzleLog ?? {} } as SaveData);
}

export function exportSave(): string {
  return JSON.stringify(pickSave(useSave.getState()), null, 1);
}

// ---- persistence: load once, then write every change right away (coalesced per tick) and when the page hides ----
let queued = false;
async function write() {
  queued = false;
  if (db) await set(KEY, pickSave(useSave.getState()), db).catch(() => {});
}

export async function loadSave() {
  const stored = db ? await get<SaveData>(KEY, db).catch(() => undefined) : undefined;
  useSave.setState({ ...(stored ? withSummaries({ ...NEW_SAVE, ...stored, settings: { ...NEW_SAVE.settings, ...stored.settings }, reviews: stored.reviews ?? {}, hero: stored.hero ?? null, puzzles: stored.puzzles ?? [], puzzleLog: stored.puzzleLog ?? {} }) : NEW_SAVE), loaded: true });
  useSave.subscribe(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => void write());
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void write();
    });
    addEventListener('pagehide', () => void write());
  }
}
