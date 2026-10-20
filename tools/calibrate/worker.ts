// A calibration worker process: plays the games it is sent and reports each result.
import { CHARACTERS, type Character } from '../../src/data/characters';
import type { Knobs } from '../../src/data/calibration';
import { nodePredict } from './engine';
import { playGame } from './play';

export interface Job {
  id: number;
  white: string;
  black: string;
  seed: number;
}

let roster = new Map<string, Character>(CHARACTERS.map((c) => [c.id, c]));

process.on('message', async (msg: { type: 'knobs'; knobs: Record<string, Knobs> } | { type: 'job'; job: Job }) => {
  if (msg.type === 'knobs') {
    roster = new Map(CHARACTERS.map((c) => [c.id, { ...c, ...msg.knobs[c.id] }]));
    return;
  }
  const { job } = msg;
  const g = await playGame(roster.get(job.white)!, roster.get(job.black)!, nodePredict, job.seed);
  process.send!({ type: 'done', id: job.id, ...g });
});
process.send!({ type: 'ready' });
