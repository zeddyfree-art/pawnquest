// Everything the player owns, kept on this device (IndexedDB) and nowhere else: rating, history, XP,
// settings and the game in progress. A save file can be exported and imported.
import { create } from 'zustand';
import { createStore, get, set } from 'idb-keyval';
import { CLOCK, RATING } from '../config';
import { characterById } from '../data/characters';
import type { Side } from '../game/chess';
import { newClock, type ClockState } from '../game/clock';
import { characterRecord, xpForGame, type GameRecord } from '../game/progress';
import { ratingDelta } from '../game/rating';
import type { Result } from '../game/rules';
import type { GameReview } from '../review/analyse';

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
  /** Screen shake and other motion; also off when the system asks for reduced motion. */
  motion: boolean;
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
}

export const NEW_SAVE: SaveData = {
  version: 1,
  rating: RATING.start,
  peak: RATING.start,
  xp: 0,
  history: [],
  active: null,
  settings: { sound: true, motion: true },
  reviews: {},
};

/** Reviews kept per save (the oldest are dropped). */
const MAX_REVIEWS = 50;

interface Store extends SaveData {
  loaded: boolean;
  /** The last finished game, for the result screen. */
  lastResult: { record: GameRecord; xpGained: number; crownEarned: boolean } | null;
  startGame(characterId: string, color: Side, auto: boolean, opts?: { startFen?: string; practice?: boolean }): void;
  setReview(gameId: string, review: GameReview): void;
  updateActive(patch: Partial<ActiveGame>): void;
  finishGame(result: Result): void;
  abandonActive(): void;
  setSettings(patch: Partial<Settings>): void;
  importSave(json: string): void;
  resetAll(): void;
}

const db = typeof indexedDB !== 'undefined' ? createStore('pawnquest', 'save') : undefined;
const KEY = 'save-v1';

const pickSave = (s: Store): SaveData => ({ version: 1, rating: s.rating, peak: s.peak, xp: s.xp, history: s.history, active: s.active, settings: s.settings, reviews: s.reviews });

export const useSave = create<Store>()((setState, getState) => ({
  ...NEW_SAVE,
  loaded: false,
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
    const delta = a.practice ? 0 : ratingDelta(s.rating, c.rating, score, s.history.length);
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
      ...(a.startFen ? { startFen: a.startFen } : {}),
      ...(a.practice ? { practice: true } : {}),
    };
    if (a.practice) {
      setState({ active: null, lastResult: { record, xpGained: 0, crownEarned: false } });
      return;
    }
    const crownBefore = characterRecord(s.history, c.id).crown;
    const history = [...s.history, record];
    const crownAfter = characterRecord(history, c.id).crown;
    const xpGained = xpForGame(score, crownBefore, crownAfter);
    setState({
      history,
      rating: record.ratingAfter,
      peak: Math.max(s.peak, record.ratingAfter),
      xp: s.xp + xpGained,
      active: null,
      lastResult: { record, xpGained, crownEarned: crownAfter !== crownBefore },
    });
  },

  setReview(gameId, review) {
    const keep = new Set(getState().history.slice(-MAX_REVIEWS).map((g) => g.id));
    const reviews = Object.fromEntries(Object.entries({ ...getState().reviews, [gameId]: review }).filter(([id]) => keep.has(id) || id === gameId));
    setState({ reviews });
  },

  abandonActive() {
    setState({ active: null });
  },

  setSettings(patch) {
    setState({ settings: { ...getState().settings, ...patch } });
  },

  importSave(json) {
    const data = parseSave(json);
    setState({ ...data, lastResult: null });
  },

  resetAll() {
    setState({ ...NEW_SAVE, lastResult: null });
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
  return { ...NEW_SAVE, ...d, settings: { ...NEW_SAVE.settings, ...(d.settings ?? {}) }, reviews: d.reviews ?? {} } as SaveData;
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
  useSave.setState({ ...(stored ? { ...NEW_SAVE, ...stored, settings: { ...NEW_SAVE.settings, ...stored.settings }, reviews: stored.reviews ?? {} } : NEW_SAVE), loaded: true });
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
