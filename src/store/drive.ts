// Sends your games to the Repertoire app (zeddyfree-art.github.io/chess) through your Google Drive: each finished game
// becomes a PGN file in "Repertoire app/Inbox", which the Repertoire app takes in at its next sync, tagged Pawnquest.
// Both apps share the Google sign-in (same site and OAuth client, scope drive.file), so they see each other's files and
// nothing else in your Drive. Nothing is sent to Google until you connect in Settings.
import { create } from 'zustand';
import { characterById } from '../data/characters';
import { gamePgn } from '../game/pgn';
import type { GameRecord } from '../game/progress';
import { useSave } from './save';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const CLIENT_ID = '611331060397-qed3b7dfpv7tfq9d40otn610dm4knumt.apps.googleusercontent.com';
/** Shared with the Repertoire app (same site), so signing in once works for both. */
const TOKEN_KEY = 'google-token';
const STATE_KEY = 'pawnquest-drive';
const APP_KEY = 'repertoireApp';

interface Stored {
  connected: boolean;
  /** Games already in the inbox (by id). */
  sent: string[];
}

export type DriveStatus = 'off' | 'sending' | 'done' | 'needs-auth' | 'error';

interface DriveState {
  connected: boolean;
  status: DriveStatus;
  error: string | null;
  /** Games still to send. */
  waiting: number;
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

function pending(): GameRecord[] {
  const sent = new Set(readStored().sent);
  return useSave.getState().history.filter((g) => sendable(g) && !sent.has(g.id));
}

export const useDrive = create<DriveState>()(() => ({ connected: readStored().connected, status: 'off', error: null, waiting: 0 }));

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

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = validToken();
  if (!token) throw new AuthError();
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } }).catch(() => {
    throw new Error('Could not reach Google Drive.');
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Google Drive error ${res.status}`);
  return res.json() as Promise<T>;
}

/** The folder with this role (the Repertoire app's tag), created when missing. */
async function folder(role: string, name: string, parent?: string): Promise<string> {
  const q = `appProperties has { key='${APP_KEY}' and value='${role}' } and trashed=false`;
  const found = await api<{ files: { id: string }[] }>(`${API}/files?${new URLSearchParams({ q, fields: 'files(id)', spaces: 'drive' })}`);
  if (found.files?.[0]) return found.files[0].id;
  const made = await api<{ id: string }>(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', appProperties: { [APP_KEY]: role }, ...(parent ? { parents: [parent] } : {}) }),
  });
  return made.id;
}

async function upload(name: string, pgn: string, inbox: string) {
  const boundary = `pq${Math.random().toString(36).slice(2)}`;
  const meta = { name, parents: [inbox], mimeType: 'application/x-chess-pgn', appProperties: { [APP_KEY]: 'inbox-game' } };
  await api(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/x-chess-pgn\r\n\r\n${pgn}\r\n--${boundary}--`,
  });
}

let running: Promise<void> | null = null;

/** Sends the games not sent yet (when connected and signed in). */
export function sendGames(): Promise<void> {
  running ??= send().finally(() => (running = null));
  return running;
}

async function send() {
  const games = pending();
  useDrive.setState({ waiting: games.length });
  if (!readStored().connected) return;
  if (!games.length) return useDrive.setState({ status: 'done', error: null });
  if (!validToken()) return useDrive.setState({ status: 'needs-auth' });
  useDrive.setState({ status: 'sending', error: null });
  try {
    const root = await folder('folder', 'Repertoire app');
    const inbox = await folder('folder-inbox', 'Inbox', root);
    const you = useSave.getState().hero?.name || 'You';
    for (const g of games) {
      const opponent = characterById(g.characterId)?.name ?? 'Opponent';
      await upload(`${g.date.slice(0, 10)} ${you} vs ${opponent}.pgn`, gamePgn(g, you, opponent), inbox);
      writeStored({ sent: [...readStored().sent, g.id] });
      useDrive.setState((s) => ({ waiting: s.waiting - 1 }));
    }
    useDrive.setState({ status: 'done' });
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
  await sendGames();
}

export function disconnectDrive() {
  writeStored({ connected: false });
  useDrive.setState({ connected: false, status: 'off', error: null });
}

/** Sends each game as it is played, and what was left waiting when the app opens. */
export function initDrive() {
  let last = useSave.getState().history;
  useSave.subscribe((s) => {
    if (s.history === last) return;
    last = s.history;
    if (readStored().connected) void sendGames();
  });
  if (readStored().connected) void sendGames();
}
