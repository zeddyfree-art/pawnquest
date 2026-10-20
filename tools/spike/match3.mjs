import "./adapt79.mjs";
import { Maia3 } from "maia3-js";
import { Chess } from "chess.js";
const maia = new Maia3(process.env.M ? { variant: "79m", modelPath: process.env.M, intraOpNumThreads: 1 } : { variant: "5m", intraOpNumThreads: 1 });
await maia.load();
const [a, ta, b, tb, n] = process.argv.slice(2).map(Number);
let scoreA = 0, plies = 0;
for (let g = 0; g < n; g++) {
  const c = new Chess(); const moves = []; const aWhite = g % 2 === 0;
  while (!c.isGameOver() && moves.length < 300) {
    const isA = (c.turn() === 'w') === aWhite;
    const r = await maia.predict({ fen: c.fen(), priorMoves: moves.length ? moves : undefined, selfElo: isA ? a : b, oppoElo: isA ? b : a, temperature: isA ? ta : tb, topP: 0.9, topK: 0 });
    c.move({ from: r.bestMove.slice(0,2), to: r.bestMove.slice(2,4), promotion: r.bestMove[4] }); moves.push(r.bestMove);
  }
  plies += moves.length;
  if (c.isCheckmate()) scoreA += ((c.turn() === 'w') !== aWhite) ? 1 : 0; else scoreA += 0.5;
}
console.log(`${process.env.M ? (process.env.M.includes("int8") ? "79M-int8" : "79M") : "5M"} ${a}@T${ta} vs ${b}@T${tb}: ${a} scored ${(100*scoreA/n).toFixed(0)}% over ${n}, avg ${Math.round(plies/n)} plies`);
