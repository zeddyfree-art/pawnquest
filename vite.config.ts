import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync } from 'node:fs';

// `base: './'` keeps every asset path relative, so the build works on GitHub Pages
// (https://<user>.github.io/pawnquest/) and from any other folder.
const commit = (process.env.GITHUB_SHA ?? '').slice(0, 7) || 'local';

export default defineConfig({
  base: './',
  define: { __APP_COMMIT__: JSON.stringify(commit) },
  plugins: [
    react(),
    // version.json lets an open tab notice that a newer version was published (see src/version.ts).
    {
      name: 'version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ commit }) });
      },
    },
    // The service worker (pwa/sw.js), with a cache of its own for every build, so a new version replaces the old one.
    {
      name: 'service-worker',
      generateBundle(_options, bundle) {
        const build = `${commit}-${Date.now().toString(36)}`;
        // Saved as soon as the service worker is installed, so the app starts offline after the first visit (the page
        // is already running before the worker is): its scripts, styles and fonts, the boards and piece sets, and the
        // short jingles. The big files (Maia's runtime, Stockfish, the region music) are saved the first time they are
        // used; the Maia models are kept by the app itself.
        const files = (dir: string) => readdirSync(new URL(`./public/${dir}`, import.meta.url), { recursive: true, withFileTypes: true })
          .filter((f) => f.isFile() && f.name.endsWith('.png'))
          .map((f) => `${f.parentPath.split('/public/')[1]}/${f.name}`);
        const jingles = readdirSync(new URL('./public/audio', import.meta.url)).filter((f) => f.startsWith('jingle-')).map((f) => `audio/${f}`);
        const precache = [...Object.keys(bundle).filter((f) => f.startsWith('assets/') && !f.endsWith('.wasm')), ...files('boards'), ...files('pieces'), ...jingles];
        const source = readFileSync(new URL('./pwa/sw.js', import.meta.url), 'utf8')
          .replace('__BUILD__', build)
          .replace("'__PRECACHE__'", precache.map((f) => JSON.stringify(`./${f}`)).join(', '));
        this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      },
    },
  ],
  resolve: {
    // maia3-js imports the full onnxruntime-web bundle; the plain WASM build is all it needs.
    alias: [{ find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' }],
  },
  worker: { format: 'es' },
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
