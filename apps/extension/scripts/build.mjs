// Builds the unpacked extension into dist/.
//
// Why a bundler: Chrome runs manifest `content_scripts` as CLASSIC scripts, so a file that
// `import`s another (tsc's output for `import ... from './x'`) throws a SyntaxError on load.
// Each entry is therefore bundled into one self-contained IIFE. Vite is already a workspace
// dependency; nothing is added.
//
// `PINKLESS_EXTENSION_DEV=1` enables development-only console diagnostics (src/content/diagnostics.ts).
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const dev = process.env.PINKLESS_EXTENSION_DEV === '1';

const entries = [
  { entry: 'src/content/index.ts', name: 'PinklessContent', file: 'content/index.js' },
  { entry: 'src/popup/index.ts', name: 'PinklessPopup', file: 'popup/index.js' },
];

await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });

for (const { entry, name, file } of entries) {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    define: { __PINKLESS_DEV__: JSON.stringify(dev) },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      minify: false,
      target: 'chrome110',
      lib: { entry, name, formats: ['iife'], fileName: () => file },
    },
  });
}

// Copies public/ (manifest.json, popup.html) into dist/.
await import('./copy-static.mjs');
