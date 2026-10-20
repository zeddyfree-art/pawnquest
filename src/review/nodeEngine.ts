// Stockfish in Node (for tests and tools/): the same lite single-threaded build as in the browser, as a child
// process spoken to over UCI. Not used by the app itself.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createRequire } from 'node:module';
import type { EngineLine } from '../engine/stockfish';
import type { ReviewEngine } from './analyse';

export class NodeEngine implements ReviewEngine {
  private proc: ChildProcessWithoutNullStreams;
  private buf = '';
  private waiting: ((line: string) => boolean) | null = null;

  constructor() {
    const path = createRequire(import.meta.url)('stockfish').findEngine('lite-single');
    this.proc = spawn(process.execPath, [path]);
    this.proc.stdout.on('data', (d) => {
      this.buf += d;
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        if (this.waiting?.(line)) this.waiting = null;
      }
    });
  }

  private send(cmd: string) {
    this.proc.stdin.write(cmd + '\n');
  }

  async ready() {
    await new Promise<void>((resolve) => {
      this.waiting = (l) => (l === 'readyok' ? (resolve(), true) : false);
      this.send('uci');
      this.send('isready');
    });
  }

  analyse(fen: string, opts: { depth?: number; movetime?: number; multiPv?: number }): Promise<EngineLine[]> {
    return new Promise((resolve) => {
      const lines: EngineLine[] = [];
      const flip = fen.split(' ')[1] === 'b' ? -1 : 1;
      this.waiting = (l) => {
        if (l.startsWith('bestmove')) return resolve(lines.filter(Boolean)), true;
        if (!l.startsWith('info') || !l.includes(' pv ')) return false;
        const t = l.split(' ');
        const val = (k: string) => t[t.indexOf(k) + 1];
        const multipv = Number(t.includes('multipv') ? val('multipv') : 1);
        const s = t.indexOf('score');
        const entry: EngineLine = { multipv, depth: Number(val('depth')), pv: t.slice(t.indexOf('pv') + 1) };
        if (t[s + 1] === 'cp') entry.cp = Number(t[s + 2]) * flip;
        else entry.mate = Number(t[s + 2]) * flip;
        lines[multipv - 1] = entry;
        return false;
      };
      this.send(`setoption name MultiPV value ${opts.multiPv ?? 1}`);
      this.send(`position fen ${fen}`);
      this.send(`go ${[opts.depth ? `depth ${opts.depth}` : '', opts.movetime ? `movetime ${opts.movetime}` : ''].join(' ').trim()}`);
    });
  }

  quit() {
    this.send('quit');
    this.proc.kill();
  }
}
