// Runs Maia-3 off the main thread. The worker downloads each model once (from the site itself), checks its
// SHA-256, keeps it in IndexedDB and runs it with ONNX Runtime (single-threaded WASM: GitHub Pages cannot
// enable cross-origin isolation).
import { createStore, get, set } from 'idb-keyval';
import { Maia3 } from 'maia3-js/web';

type Load = { type: 'load'; model: string; url: string; sha256: string; size: number };
type Run = { type: 'predict'; id: number; model: string; fen: string; priorFens: string[]; selfElo: number; oppoElo: number };

const store = createStore('pawnquest-models', 'models');
const models = new Map<string, Maia3>();

async function sha256(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function download(msg: Load): Promise<Uint8Array> {
  const res = await fetch(msg.url).catch(() => null);
  if (!res?.ok || !res.body || (res.headers.get('content-type') ?? '').includes('text/html')) {
    throw new Error('Could not download your opponent. Check your internet connection and try again.');
  }
  let buf = new Uint8Array(msg.size);
  let at = 0;
  let reported = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (at + value.length > buf.length) {
      const bigger = new Uint8Array(Math.max(Math.ceil(buf.length * 1.25), at + value.length));
      bigger.set(buf.subarray(0, at));
      buf = bigger;
    }
    buf.set(value, at);
    at += value.length;
    const pct = Math.min(99, Math.floor((at / msg.size) * 100));
    if (pct >= reported + 2) {
      reported = pct;
      postMessage({ type: 'progress', model: msg.model, progress: pct });
    }
  }
  return at === buf.length ? buf : buf.slice(0, at);
}

async function readModel(msg: Load): Promise<Uint8Array> {
  const key = `${msg.model}-${msg.sha256.slice(0, 12)}`;
  const cached = await get(key, store).catch(() => undefined);
  if (cached instanceof Blob) return new Uint8Array(await cached.arrayBuffer());
  postMessage({ type: 'status', model: msg.model, status: 'downloading' });
  const bytes = await download(msg);
  if ((await sha256(bytes)) !== msg.sha256) throw new Error('The download was incomplete. Please try again.');
  // A Blob lives on disk rather than in memory.
  await set(key, new Blob([bytes as Uint8Array<ArrayBuffer>]), store).catch(() => {});
  return bytes;
}

self.onmessage = async (e: MessageEvent<Load | Run>) => {
  const msg = e.data;
  try {
    if (msg.type === 'load') {
      if (!models.has(msg.model)) {
        const bytes = await readModel(msg);
        postMessage({ type: 'status', model: msg.model, status: 'loading' });
        const maia = new Maia3({ modelBytes: bytes.buffer as ArrayBuffer, numThreads: 1, topK: 0 });
        await maia.load();
        models.set(msg.model, maia);
      }
      postMessage({ type: 'ready', model: msg.model });
      return;
    }
    const maia = models.get(msg.model);
    if (!maia) throw new Error('The opponent is not loaded yet.');
    const r = await maia.predict({
      fen: msg.fen,
      priorFens: msg.priorFens.length ? msg.priorFens : undefined,
      selfElo: msg.selfElo,
      oppoElo: msg.oppoElo,
      topK: 0,
    });
    postMessage({ type: 'result', id: msg.id, moves: [...r.moves.entries()], winChance: r.winProbability });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postMessage({ type: 'error', id: 'id' in msg ? msg.id : undefined, model: msg.model, message: message || 'The opponent stopped working.' });
  }
};
