import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
