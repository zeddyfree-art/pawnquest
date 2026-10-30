// Google Drive, for two things:
// - Your progress on every device: the save is kept in "Repertoire app/Sync/pawnquest-sync.json" and merged with
//   this device's (store/merge.ts) whenever either changes, so a phone and a laptop share one progress.
// - Your games in the Repertoire app (zeddyfree-art.github.io/chess): each finished game becomes a PGN file in
//   "Repertoire app/Inbox", which the Repertoire app takes in at its next sync, tagged Pawnquest.
// Both apps share the Google sign-in (same site and OAuth client, scope drive.file), so they see each other's files and
// nothing else in your Drive. Nothing is sent to Google until you connect. Google's sign-in lasts an hour; after that
// a tap on "Sign in" (the window closes by itself) lets syncing go on.
import { create } from 'zustand';
import { characterById } from '../data/characters';
import { gamePgn } from '../game/pgn';
import type { GameRecord } from '../game/progress';
import { mergeSaves, type SyncedSave } from './merge';
import { parseSave, useSave } from './save';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const CLIENT_ID = '611331060397-qed3b7dfpv7tfq9d40otn610dm4knumt.apps.googleusercontent.com';
/** Shared with the Repertoire app (same site), so signing in once works for both. */
const TOKEN_KEY = 'google-token';
const STATE_KEY = 'pawnquest-drive';
const APP_KEY = 'repertoireApp';
const SAVE_ROLE = 'pawnquest-sync';

interface Stored {
  connected: boolean;
  /** Games already in the inbox (by id), from before the list was kept in the save. */
  sent: string[];
  /** The save file on Drive and its version when this device last synced it. */
  fileId?: string;
  version?: string;
  /** Changed here since the last sync. */
  dirty?: boolean;
  lastSyncAt?: number;
}

export type DriveStatus = 'off' | 'syncing' | 'synced' | 'needs-auth' | 'error';

interface DriveState {
  connected: boolean;
  status: DriveStatus;
  error: string | null;
  lastSyncAt: number | null;
}

function readStored(): Stored {
  try {
    return { connected: false, sent: [], ...(JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}') as Partial<Stored>) };
  } catch {
    return { connected: false, sent: [] };
  }
}

function writeStored(patch: Partial<Stored>) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...readStored(), ...patch }));
  } catch {
    /* ignore */
  }
}

/** Rated games from the standard start (the Repertoire app reads only those). */
const sendable = (g: GameRecord) => !g.practice && !g.startFen && g.moves.length >= 2;

const initial = readStored();
export const useDrive = create<DriveState>()(() => ({ connected: initial.connected, status: initial.connected ? 'synced' : 'off', error: null, lastSyncAt: initial.lastSyncAt ?? null }));

// ---------------------------------------------------------------------------
// Google sign-in (Google Identity Services, token model)

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (r: TokenResponse) => void;
            error_callback?: (e: { type: string; message?: string }) => void;
          }): { requestAccessToken(o?: { prompt?: string }): void };
        };
      };
    };
  }
}

let gis: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gis ??= new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true });
    s.onload = () => resolve();
    s.onerror = () => {
      gis = null;
      reject(new Error('Could not load Google sign-in.'));
    };
    document.head.appendChild(s);
  });
  return gis;
}

function validToken(): string | null {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as { token: string; expiresAt: number } | null;
    return t && t.expiresAt - 60_000 > Date.now() ? t.token : null;
  } catch {
    return null;
  }
}

/** Opens Google's popup; call from a click. */
async function requestToken(): Promise<void> {
  await loadGis();
  await new Promise<void>((resolve, reject) => {
    window.google!.accounts.oauth2
      .initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (r) => {
          if (r.error || !r.access_token) return reject(new Error(r.error_description || r.error || 'Google sign-in failed.'));
          try {
            localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 }));
          } catch {
            /* ignore */
          }
          resolve();
        },
        error_callback: (e) => reject(new Error(e.type === 'popup_closed' ? 'The Google window was closed.' : e.message || 'Google sign-in failed.')),
      })
      .requestAccessToken({ prompt: '' });
  });
}

// ---------------------------------------------------------------------------
// Drive

class AuthError extends Error {}

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const token = validToken();
  if (!token) throw new AuthError();
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } }).catch(() => {
    throw new Error('Could not reach Google Drive.');
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw Object.assign(new Error(`Google Drive error ${res.status}`), { status: res.status });
  return res;
}

const api = async <T>(url: string, init: RequestInit = {}) => (await call(url, init)).json() as Promise<T>;

interface DriveFile {
  id: string;
  version?: string;
}

async function findByRole(role: string): Promise<DriveFile | null> {
  const q = `appProperties has { key='${APP_KEY}' and value='${role}' } and trashed=false`;
  const r = await api<{ files: DriveFile[] }>(`${API}/files?${new URLSearchParams({ q, fields: 'files(id,version)', spaces: 'drive', orderBy: 'modifiedTime desc' })}`);
  return r.files?.[0] ?? null;
}

/** The folder with this role (the Repertoire app's tag), created when missing. */
async function folder(role: string, name: string, parent?: string): Promise<string> {
  const found = await findByRole(role);
  if (found) return found.id;
  const made = await api<{ id: string }>(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', appProperties: { [APP_KEY]: role }, ...(parent ? { parents: [parent] } : {}) }),
  });
  return made.id;
}

async function createFile(name: string, role: string, parent: string, type: string, content: string): Promise<DriveFile> {
  const boundary = `pq${Math.random().toString(36).slice(2)}`;
  const meta = { name, parents: [parent], mimeType: type, appProperties: { [APP_KEY]: role } };
  return api<DriveFile>(`${UPLOAD}/files?uploadType=multipart&fields=id,version`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${type}\r\n\r\n${content}\r\n--${boundary}--`,
  });
}

const updateFile = (id: string, content: string) =>
  api<DriveFile>(`${UPLOAD}/files/${id}?uploadType=media&fields=id,version`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: content });

async function fileMeta(id: string): Promise<DriveFile | null> {
  try {
    const f = await api<DriveFile & { trashed?: boolean }>(`${API}/files/${id}?fields=id,version,trashed`);
    return f.trashed ? null : f;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

const download = async (id: string) => (await call(`${API}/files/${id}?alt=media`)).text();

// ---------------------------------------------------------------------------
// The save

const synced = (s: SyncedSave): SyncedSave => ({
  version: 1,
  rating: s.rating,
  peak: s.peak,
  xp: s.xp,
  history: s.history,
  reviews: s.reviews,
  hero: s.hero,
  puzzles: s.puzzles,
  puzzleLog: s.puzzleLog,
  epoch: s.epoch,
  heroAt: s.heroAt,
  sent: s.sent,
});
const serialize = (s: SyncedSave) => JSON.stringify(synced(s));

let applying = false;
let changes = 0;

async function syncSave() {
  const stored = readStored();
  const changesAtStart = changes;
  let file = stored.fileId ? await fileMeta(stored.fileId) : null;
  file ??= await findByRole(SAVE_ROLE);
  let version: string | undefined;
  if (!file) {
    const root = await folder('folder', 'Repertoire app');
    const sync = await folder('folder-sync', 'Sync', root);
    file = await createFile('pawnquest-sync.json', SAVE_ROLE, sync, 'application/json', serialize(useSave.getState()));
    version = file.version;
  } else if (file.version !== stored.version) {
    // Changed on another device: merge both ways.
    const remote = parseSave(await download(file.id));
    const merged = synced(mergeSaves(synced(useSave.getState()), remote));
    applying = true;
    try {
      useSave.setState(merged);
    } finally {
      applying = false;
    }
    version = serialize(merged) === serialize(remote) ? file.version : (await updateFile(file.id, serialize(merged))).version;
  } else if (stored.dirty) {
    version = (await updateFile(file.id, serialize(useSave.getState()))).version;
  } else {
    version = file.version;
  }
  writeStored({ fileId: file.id, version, dirty: changes !== changesAtStart });
}

// ---------------------------------------------------------------------------
// Games for the Repertoire app

async function sendGames() {
  // Earlier versions kept the list on the device only.
  const sent = new Set([...(useSave.getState().sent ?? []), ...readStored().sent]);
  const games = useSave.getState().history.filter((g) => sendable(g) && !sent.has(g.id));
  if (!games.length) return;
  const root = await folder('folder', 'Repertoire app');
  const inbox = await folder('folder-inbox', 'Inbox', root);
  const you = useSave.getState().hero?.name || 'You';
  for (const g of games) {
    const opponent = characterById(g.characterId)?.name ?? 'Opponent';
    await createFile(`${g.date.slice(0, 10)} ${you} vs ${opponent}.pgn`, 'inbox-game', inbox, 'application/x-chess-pgn', gamePgn(g, you, opponent));
    sent.add(g.id);
    useSave.setState({ sent: [...sent] });
  }
}

// ---------------------------------------------------------------------------
// Running

let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Syncs now (or right after the run in progress). */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = run().finally(() => {
    running = null;
    if (again || readStored().dirty) {
      again = false;
      schedule(1000);
    }
  });
  return running;
}

function schedule(ms: number) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), ms);
}

async function run() {
  if (!readStored().connected || !useSave.getState().loaded) return;
  if (!validToken()) return useDrive.setState({ status: 'needs-auth' });
  useDrive.setState({ status: 'syncing', error: null });
  try {
    await syncSave();
    await sendGames();
    const now = Date.now();
    writeStored({ lastSyncAt: now });
    useDrive.setState({ status: 'synced', lastSyncAt: now });
  } catch (e) {
    useDrive.setState(e instanceof AuthError ? { status: 'needs-auth' } : { status: 'error', error: (e as Error).message });
  }
}

/** Connect (or sign in again): from a click, since it opens Google's window. */
export async function connectDrive(): Promise<void> {
  try {
    if (!validToken()) await requestToken();
  } catch (e) {
    useDrive.setState({ error: (e as Error).message });
    return;
  }
  writeStored({ connected: true });
  useDrive.setState({ connected: true });
  await syncNow();
}

export function disconnectDrive() {
  writeStored({ connected: false, fileId: undefined, version: undefined, dirty: false });
  useDrive.setState({ connected: false, status: 'off', error: null });
}

/** Call once the save is loaded: syncs on every change, when the app comes back into view and every few minutes. */
export function initDrive() {
  let last = synced(useSave.getState());
  useSave.subscribe((s) => {
    const now = synced(s);
    if ((Object.keys(now) as (keyof SyncedSave)[]).every((k) => now[k] === last[k])) return;
    last = now;
    if (applying) return;
    changes++;
    if (!readStored().connected) return;
    writeStored({ dirty: true });
    schedule(2000);
  });
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' || readStored().dirty) schedule(300);
    });
  setInterval(() => document.visibilityState === 'visible' && void syncNow(), 3 * 60_000);
  void syncNow();
}
