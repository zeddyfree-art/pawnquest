// Merging two saves of the same player (this device and Google Drive), so playing on a phone and a laptop makes one
// progress: every game from both (the rating replayed over them in order), every review, puzzle and solved puzzle,
// and the XP of both. The hero is the one changed last. "Start over" or loading a save file starts a new save
// (`epoch`), which replaces the older one everywhere. The game in progress and the settings stay per device.
import { RATING, XP } from '../config';
import { habitChips } from '../game/habits';
import { characterRecord, xpForGame, type GameRecord } from '../game/progress';
import { ratingDelta } from '../game/rating';
import type { PuzzleTry } from '../review/puzzles';
import type { SaveData } from './save';

/** The parts of a save that are shared between devices. */
export type SyncedSave = Omit<SaveData, 'active' | 'settings'>;

const byDate = (a: GameRecord, b: GameRecord) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

/** The same game from both sides: keep the one with its review summary. */
const better = (a: GameRecord, b: GameRecord) => (a.review || !b.review ? a : b);

/** Ratings replayed from game `from` on, starting from the rating before it. */
function replayRatings(games: GameRecord[], from: number): GameRecord[] {
  let rating = from > 0 ? games[from - 1].ratingAfter : RATING.start;
  let rated = games.slice(0, from).filter((g) => !g.unrated).length;
  return games.map((g, i) => {
    if (i < from) return g;
    const delta = g.unrated ? 0 : ratingDelta(rating, g.opponentRating, g.score, rated);
    const out = { ...g, ratingBefore: rating, ratingAfter: rating + delta };
    rating += delta;
    if (!g.unrated) rated++;
    return out;
  });
}

/** XP a game gave, given the games before it. */
function gameXp(g: GameRecord, before: GameRecord[]): number {
  const crownBefore = characterRecord(before, g.characterId).crown;
  const crownAfter = characterRecord([...before, g], g.characterId).crown;
  return xpForGame(g.score, crownBefore, crownAfter) + habitChips(g, before).length * XP.habit;
}

function mergeLog(a: Record<string, PuzzleTry>, b: Record<string, PuzzleTry>): Record<string, PuzzleTry> {
  const out = { ...a };
  for (const [id, t] of Object.entries(b)) {
    const o = out[id];
    out[id] = o ? { solved: o.solved || t.solved, firstTry: o.firstTry || t.firstTry, date: o.date > t.date ? o.date : t.date } : t;
  }
  return out;
}

export function mergeSaves<T extends SyncedSave>(local: T, remote: SyncedSave): T {
  // A newer start (Start over, a loaded save file) replaces the other side.
  if ((remote.epoch ?? '') > (local.epoch ?? '')) return { ...local, ...remote };
  if ((local.epoch ?? '') > (remote.epoch ?? '')) return local;

  // Games: everything from both, in order. Where the order changes, the ratings are replayed from there.
  const ids = new Map(local.history.map((g) => [g.id, g]));
  for (const g of remote.history) ids.set(g.id, ids.has(g.id) ? better(ids.get(g.id)!, g) : g);
  const all = [...ids.values()].sort(byDate);
  let same = 0;
  while (same < all.length && same < local.history.length && all[same].id === local.history[same].id) same++;
  const history = same === all.length && same === local.history.length ? all : replayRatings(all, same);
  const changed = history.length !== local.history.length || same < local.history.length;
  const rating = changed ? (history.at(-1)?.ratingAfter ?? RATING.start) : local.rating;
  const peak = Math.max(local.peak, remote.peak, rating);

  // XP: the side with more, plus what the other side earned that it does not have (its own games and puzzles).
  const [more, less] = local.xp >= remote.xp ? [local, remote] : [remote, local];
  const known = new Set(more.history.map((g) => g.id));
  let xp = more.xp;
  history.forEach((g, i) => {
    if (!known.has(g.id) && less.history.some((h) => h.id === g.id)) xp += gameXp(g, history.slice(0, i));
  });
  for (const [id, t] of Object.entries(less.puzzleLog)) if (t.solved && !more.puzzleLog[id]?.solved) xp += XP.puzzle;

  // The hero: a device that has not played yet (a new phone) takes the one that has; otherwise the one changed last.
  const hero =
    !remote.hero || (local.history.length && !remote.history.length)
      ? (local.hero ?? remote.hero)
      : !local.hero || (remote.history.length && !local.history.length) || (remote.heroAt ?? '') > (local.heroAt ?? '')
        ? remote.hero
        : local.hero;
  const heroAt = hero === local.hero ? local.heroAt : remote.heroAt;

  const puzzleIds = new Set(local.puzzles.map((p) => p.id));
  return {
    ...local,
    rating,
    peak,
    xp,
    history,
    reviews: { ...remote.reviews, ...local.reviews },
    hero,
    heroAt,
    puzzles: [...local.puzzles, ...remote.puzzles.filter((p) => !puzzleIds.has(p.id))],
    puzzleLog: mergeLog(local.puzzleLog, remote.puzzleLog),
    ...(local.sent || remote.sent ? { sent: [...new Set([...(local.sent ?? []), ...(remote.sent ?? [])])] } : {}),
  };
}
