// Background music: one track for the map and one per region in a fight (from the Ninja Adventure pack, CC0),
// crossfaded when the place changes. Browsers only allow sound after the first tap, so the track starts then.
// A missing file is simply silent.
import type { WorldId } from '../data/characters';
import { useSave } from '../store/save';

export type TrackId = 'map' | WorldId;

const url = (name: string) => `${import.meta.env.BASE_URL}audio/${name}.mp3`;
const FADE_MS = 900;

let current: { id: TrackId; el: HTMLAudioElement } | null = null;
let wanted: TrackId | null = null;
let unlocked = false;

function volume() {
  const s = useSave.getState().settings;
  return s.music ? s.musicVolume : 0;
}

function fade(el: HTMLAudioElement, to: number, done?: () => void) {
  const from = el.volume;
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / FADE_MS);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
    else done?.();
  };
  requestAnimationFrame(step);
}

function start(id: TrackId) {
  const el = new Audio(url(id));
  el.loop = true;
  el.volume = 0;
  el.addEventListener('error', () => {
    if (current?.el === el) current = null;
  });
  void el.play().then(
    () => fade(el, volume()),
    () => {},
  );
  current = { id, el };
}

function apply() {
  if (!unlocked || typeof Audio === 'undefined') return;
  const v = volume();
  if (!wanted || v === 0) {
    if (current) {
      const old = current.el;
      fade(old, 0, () => old.pause());
      current = null;
    }
    return;
  }
  if (current?.id === wanted) {
    current.el.volume = v;
    return;
  }
  if (current) {
    const old = current.el;
    fade(old, 0, () => old.pause());
  }
  start(wanted);
}

/** The track for where the player is now (null for silence, e.g. on the result screen). */
export function setTrack(id: TrackId | null) {
  wanted = id;
  apply();
}

/** Call when the music settings change. */
export const refreshMusic = () => apply();

if (typeof window !== 'undefined') {
  const unlock = () => {
    unlocked = true;
    apply();
    removeEventListener('pointerdown', unlock);
    removeEventListener('keydown', unlock);
  };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
  // Pause in the background, pick up again on return.
  document.addEventListener('visibilitychange', () => {
    if (!current) return;
    if (document.visibilityState === 'hidden') current.el.pause();
    else void current.el.play().catch(() => {});
  });
}

/** A short jingle from a file; resolves false when it cannot play (missing file, sound off). */
export function jingle(name: 'win' | 'lose' | 'reward'): Promise<boolean> {
  if (typeof Audio === 'undefined' || !useSave.getState().settings.sound) return Promise.resolve(false);
  const el = new Audio(url(`jingle-${name}`));
  el.volume = Math.min(1, 0.3 + volume());
  return el.play().then(
    () => true,
    () => false,
  );
}
