import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Test runner config for the Marketplace. Mirrors the `@` -> `src` alias
 * that apps/marketplace/vite.config.ts (owned by Agent 1) is expected to
 * define, so tests resolve modules the same way the app build does.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    name: 'marketplace',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
