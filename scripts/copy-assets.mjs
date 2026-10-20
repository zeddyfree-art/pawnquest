// Copies files the site serves as-is from its own origin into public/: the Maia-3 5M model that ships inside
// maia3-js (22.5 MB, AGPL-3.0 weights) and the single-threaded lite Stockfish 19 build (a Web Worker, GPL-3.0).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'maia3-js', 'models', 'maia3_5m.onnx');
const to = join(root, 'public', 'models', 'maia3_5m.onnx');
if (!existsSync(from)) {
  console.warn('[copy-assets] maia3-js model not found, skipping');
} else {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log('[copy-assets] copied maia3_5m.onnx');
}

const sfFrom = join(root, 'node_modules', 'stockfish', 'bin');
const sfTo = join(root, 'public', 'stockfish');
if (!existsSync(sfFrom)) {
  console.warn('[copy-assets] stockfish not found, skipping');
} else {
  mkdirSync(sfTo, { recursive: true });
  for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) copyFileSync(join(sfFrom, f), join(sfTo, f));
  console.log('[copy-assets] copied Stockfish 19 lite (single-threaded)');
}
