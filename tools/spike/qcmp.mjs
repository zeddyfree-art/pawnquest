import "./adapt79.mjs";
import { Maia3 } from "maia3-js";
import { Chess } from "chess.js";
const small = new Maia3({ variant: "5m", intraOpNumThreads: 1 }); await small.load();
const a = new Maia3({ variant: "79m", modelPath: "../models/maia3-79m.onnx", intraOpNumThreads: 1 }); await a.load();
const b = new Maia3({ variant: "79m", modelPath: "../models/maia3-79m-int8.onnx", intraOpNumThreads: 1 }); await b.load();
const pos = [];
for (let g = 0; g < 6; g++) { const c = new Chess(); while (!c.isGameOver() && c.history().length < 80) { const r = await small.predict({ fen: c.fen(), selfElo: 1200, temperature: 1, topP: 0.95, topK: 0 }); c.move({from:r.bestMove.slice(0,2),to:r.bestMove.slice(2,4),promotion:r.bestMove[4]}); if (!c.isGameOver() && c.history().length % 3 === 0) pos.push(c.fen()); } }
let agree = 0, tv = 0, ta = 0, tb = 0;
for (const [i, fen] of pos.entries()) {
  const elo = [600, 1200, 1800, 2400][i % 4];
  let s = performance.now(); const ra = await a.predict({ fen, selfElo: elo, topK: 0 }); ta += performance.now() - s;
  s = performance.now(); const rb = await b.predict({ fen, selfElo: elo, topK: 0 }); tb += performance.now() - s;
  const top = (r) => [...r.moves.entries()].sort((x, y) => y[1] - x[1])[0][0];
  if (top(ra) === top(rb)) agree++;
  let d = 0; for (const [m, p] of ra.moves) d += Math.abs(p - (rb.moves.get(m) ?? 0)); tv += d / 2;
}
console.log(`${pos.length} positions: top-1 agreement ${(100*agree/pos.length).toFixed(1)}%, mean total-variation ${(tv/pos.length).toFixed(3)}, fp32 ${(ta/pos.length).toFixed(0)} ms, int8 ${(tb/pos.length).toFixed(0)} ms`);
