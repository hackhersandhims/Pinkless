import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '../..');

export default defineConfig({
  server: {
    port: 4174,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
});
