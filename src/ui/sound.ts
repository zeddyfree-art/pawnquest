// Chiptune sound effects synthesised on the fly (no audio files): a thud for a move, a puff for a capture,
// a two-note alarm for check, short jingles for the result.
import { useSave } from '../store/save';

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (!useSave.getState().settings.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.12) {
  const a = audio();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  move: () => tone(110, 0, 0.08, 'triangle', 0.25),
  capture: () => (noise(0.12), tone(90, 0, 0.1, 'triangle', 0.2)),
  check: () => (tone(880, 0, 0.08), tone(660, 0.09, 0.1)),
  start: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.09, 0.12)),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.18)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.22, 'triangle', 0.12)),
  draw: () => [440, 440].forEach((f, i) => tone(f, i * 0.15, 0.12, 'triangle', 0.12)),
};
