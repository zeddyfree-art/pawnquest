// Builds public/models/maia3_79m_int8.onnx (82 MB): downloads Mobile Maia's ONNX export of the official
// Maia-3 79M checkpoint (AGPL-3.0, pinned commit, SHA-256 checked), then runs tools/models/convert.py, which
// quantises it to int8 and renames its tensors to match the 5M model. The result is byte-identical on every run
// with the pinned Python packages, so its hash is checked too. Needs python3 with tools/models/requirements.txt.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';

const SOURCE_URL =
  'https://media.githubusercontent.com/media/Dash1971/maia-chess-android/ebe11cf1c2e973fa50eb99391181c29d2f545937/assets/models/maia3-79m.onnx';
const SOURCE_SHA256 = '3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010';
const OUTPUT_SHA256 = 'dc194880ff00b743825ba6a02b91b08515d2bc1987e13c7dbd262af6a840cb10';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'models');
const source = join(cacheDir, 'maia3-79m.onnx');
const dest = join(root, 'public', 'models', 'maia3_79m_int8.onnx');
const python = process.env.PYTHON ?? 'python3';

async function sha(file) {
  const h = createHash('sha256');
  await pipeline(createReadStream(file), h);
  return h.digest('hex');
}

if (existsSync(dest) && (await sha(dest)) === OUTPUT_SHA256) {
  console.log('[fetch-models] maia3_79m_int8.onnx already present');
  process.exit(0);
}
mkdirSync(cacheDir, { recursive: true });
if (!existsSync(source) || (await sha(source)) !== SOURCE_SHA256) {
  console.log('[fetch-models] downloading the 79M model (316 MB)…');
  const res = await fetch(SOURCE_URL);
  if (!res.ok || !res.body) throw new Error(`[fetch-models] download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(source + '.part'));
  renameSync(source + '.part', source);
  if ((await sha(source)) !== SOURCE_SHA256) throw new Error('[fetch-models] source checksum mismatch');
}
mkdirSync(dirname(dest), { recursive: true });
execFileSync(python, ['-I', join(root, 'tools', 'models', 'convert.py'), source, dest], { stdio: 'inherit' });
const got = await sha(dest);
if (got !== OUTPUT_SHA256) throw new Error(`[fetch-models] output checksum ${got} ≠ ${OUTPUT_SHA256} (Python package versions?)`);
console.log('[fetch-models] built maia3_79m_int8.onnx');
