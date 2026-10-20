// Maia in Node for calibration: the same networks as the app (public/models), run by onnxruntime-node on one
// thread per process. onnxruntime-node is not an app dependency: install it for this tool only with
// `npm i --no-save --ignore-scripts onnxruntime-node@1.23`.
import { Maia3 } from 'maia3-js';
import type { ModelId } from '../../src/config';
import type { Predict } from '../../src/engine/botPlayer';

const PATHS: Record<ModelId, [variant: '5m' | '79m', path: string]> = {
  '5m': ['5m', 'public/models/maia3_5m.onnx'],
  '79m': ['79m', 'public/models/maia3_79m_int8.onnx'],
};
const loaded = new Map<ModelId, Promise<Maia3>>();

function model(id: ModelId): Promise<Maia3> {
  let m = loaded.get(id);
  if (!m) {
    const [variant, modelPath] = PATHS[id];
    const maia = new Maia3({ variant, modelPath, intraOpNumThreads: 1, topK: 0 });
    m = maia.load().then(() => maia);
    loaded.set(id, m);
  }
  return m;
}

/** The app's Predict, backed by Node: the last eight positions, both Elos, the model. */
export const nodePredict: Predict = async (req) => {
  const maia = await model(req.model);
  const fens = req.fens;
  const r = await maia.predict({
    fen: fens[fens.length - 1],
    priorFens: fens.length > 1 ? fens.slice(-8, -1) : undefined,
    selfElo: req.selfElo,
    oppoElo: req.oppoElo,
    topK: 0,
  });
  return { moves: [...r.moves.entries()].map(([uci, p]) => ({ uci, p })), winChance: r.winProbability };
};
