import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const dirname = path.dirname(fileURLToPath(import.meta.url));
// The repo root, two levels up from apps/marketplace. Marketplace source
// imports catalog/matcher/tokens packages via relative paths (see
// src/lib/types.ts), so both the dev server and the build need to reach
// outside this app's own directory.
const repoRoot = path.resolve(dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
