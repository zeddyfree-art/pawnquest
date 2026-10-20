const { Chess } = require("chess.js");
const path = require("stockfish").findEngine("lite-single");
const { spawn } = require("child_process");
const p = spawn(process.execPath, [path]);
const moves = "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Nce7 O-O O-O Rfe1 c6 a4 Qb6 Qxb6 axb6 Ne4 Bf5 Ng3 Bg6 Ne5 Rfd8 Nxg6 Nxg6 Bxd5 Rxd5 Re7".split(" ");
const c = new Chess(); const fens=[c.fen()]; for (const m of moves){c.move(m);fens.push(c.fen());}
const depth = +process.argv[2]; let i=0, start, buf="";
const send = s => p.stdin.write(s+"\n");
p.stdout.on("data", d => { buf += d; let k; while ((k = buf.indexOf("\n")) >= 0) { const l = buf.slice(0,k).trim(); buf = buf.slice(k+1);
  if (l === "readyok") { start = Date.now(); go(); }
  if (l.startsWith("bestmove")) { i++; if (i >= fens.length) { console.log(`depth ${depth}: ${fens.length} positions, ${((Date.now()-start)/1000).toFixed(1)}s, ${((Date.now()-start)/fens.length).toFixed(0)} ms/pos`); p.kill(); } else go(); } } });
function go(){ send("position fen "+fens[i]); send("go depth "+depth); }
send("uci"); send("setoption name Hash value 32"); send("isready");
