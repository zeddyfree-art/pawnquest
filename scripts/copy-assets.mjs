// Copies the Maia-3 5M model that ships inside maia3-js (22.5 MB, AGPL-3.0 weights) into public/models,
// so the site serves it from its own origin.
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
