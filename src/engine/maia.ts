// The page's side of the Maia worker: load a model (once), ask for move probabilities.
import { create } from 'zustand';
import type { ModelId } from '../config';
import type { Predict } from './botPlayer';

export const MODELS: Record<ModelId, { file: string; sha256: string; size: number; label: string }> = {
  '5m': { file: 'maia3_5m.onnx', sha256: 'f7bd01b3e41dceb5e93eb9f4c61e9c4db8b35411effd1d8c984b006cd74bb804', size: 22_550_022, label: '23 MB' },
  '79m': { file: 'maia3_79m_int8.onnx', sha256: 'dc194880ff00b743825ba6a02b91b08515d2bc1987e13c7dbd262af6a840cb10', size: 81_615_897, label: '82 MB' },
};

type Status = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
export const useMaia = create<{ status: Record<ModelId, Status>; progress: Record<ModelId, number>; error: string | null }>()(() => ({
  status: { '5m': 'idle', '79m': 'idle' },
  progress: { '5m': 0, '79m': 0 },
  error: null,
}));

let worker: Worker | null = null;
const loading = new Map<ModelId, Promise<void>>();
const waiting = new Map<ModelId, { resolve: () => void; reject: (e: Error) => void }>();
const pending = new Map<number, { resolve: (r: { moves: [string, number][]; winChance: number }) => void; reject: (e: Error) => void }>();
let seq = 0;

function setStatus(model: ModelId, s: Status) {
  useMaia.setState((st) => ({ status: { ...st.status, [model]: s } }));
}

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('./maia.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'progress') useMaia.setState((st) => ({ progress: { ...st.progress, [m.model]: m.progress } }));
    else if (m.type === 'status') setStatus(m.model, m.status);
    else if (m.type === 'ready') {
      setStatus(m.model, 'ready');
      useMaia.setState((st) => ({ progress: { ...st.progress, [m.model]: 100 }, error: null }));
      waiting.get(m.model)?.resolve();
      waiting.delete(m.model);
    } else if (m.type === 'result') {
      pending.get(m.id)?.resolve({ moves: m.moves, winChance: m.winChance });
      pending.delete(m.id);
    } else if (m.type === 'error') {
      const err = new Error(m.message);
      if (m.id !== undefined) {
        pending.get(m.id)?.reject(err);
        pending.delete(m.id);
      } else {
        setStatus(m.model, 'error');
        useMaia.setState({ error: m.message });
        waiting.get(m.model)?.reject(err);
        waiting.delete(m.model);
        loading.delete(m.model);
      }
    }
  };
  w.onerror = (e) => {
    e.preventDefault();
    const err = new Error('The opponent stopped working. Please reload the page.');
    for (const p of pending.values()) p.reject(err);
    pending.clear();
    for (const [model, wt] of waiting) {
      setStatus(model, 'error');
      wt.reject(err);
    }
    waiting.clear();
    loading.clear();
    useMaia.setState({ error: err.message });
    worker?.terminate();
    worker = null;
  };
  worker = w;
  return w;
}

export function loadModel(model: ModelId): Promise<void> {
  let p = loading.get(model);
  if (p) return p;
  p = new Promise<void>((resolve, reject) => {
    waiting.set(model, { resolve, reject });
    setStatus(model, 'loading');
    const meta = MODELS[model];
    getWorker().postMessage({ type: 'load', model, url: new URL(`${import.meta.env.BASE_URL}models/${meta.file}`, location.href).href, sha256: meta.sha256, size: meta.size });
  });
  loading.set(model, p);
  return p;
}

export const maiaPredict: Predict = async ({ fens, selfElo, oppoElo, model }) => {
  await loadModel(model);
  const id = ++seq;
  const out = await new Promise<{ moves: [string, number][]; winChance: number }>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('The opponent did not answer in time.'));
    }, 30_000);
    pending.set(id, {
      resolve: (r) => (clearTimeout(timer), resolve(r)),
      reject: (e) => (clearTimeout(timer), reject(e)),
    });
    getWorker().postMessage({ type: 'predict', id, model, fen: fens[fens.length - 1], priorFens: fens.slice(-8, -1), selfElo, oppoElo });
  });
  return { moves: out.moves.map(([uci, p]) => ({ uci, p })), winChance: out.winChance };
};
