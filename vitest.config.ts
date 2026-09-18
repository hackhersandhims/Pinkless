import { defineConfig } from 'vitest/config';

/**
 * Root test runner for `pnpm run test`. Each app that needs a DOM owns its own
 * config; everything else (catalog, matcher, API providers) runs in Node.
 */
export default defineConfig({
  test: {
    projects: [
      'apps/marketplace/vitest.config.ts',
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['packages/**/*.test.ts', 'apps/api/**/*.test.ts', 'apps/extension/**/*.test.ts'],
        },
      },
    ],
  },
});
