// Builds the unpacked extension into dist/.
//
// Why a bundler: Chrome runs manifest `content_scripts` as CLASSIC scripts, so a file that
// `import`s another (tsc's output for `import ... from './x'`) throws a SyntaxError on load.
// The content script and popup are therefore each bundled into one self-contained IIFE; the
// background service worker is declared `"type": "module"` and is bundled as one ES module.
// Vite is already a workspace dependency; nothing is added.
//
// `PINKLESS_EXTENSION_DEV=1` enables development-only console diagnostics (src/content/diagnostics.ts).
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = new URL('../dist/', import.meta.url);
const dev = process.env.PINKLESS_EXTENSION_DEV === '1';

const entries = [
  {
    entry: 'src/content/index.ts',
    name: 'PinklessContent',
    file: 'content/index.js',
    format: 'iife',
  },
  { entry: 'src/popup/index.ts', name: 'PinklessPopup', file: 'popup/index.js', format: 'iife' },
  {
    entry: 'src/background/index.ts',
    name: 'PinklessBackground',
    file: 'background/index.js',
    format: 'es',
  },
];

await rm(dist, { recursive: true, force: true });

for (const { entry, name, file, format } of entries) {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    publicDir: false,
    define: { __PINKLESS_DEV__: JSON.stringify(dev) },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      minify: false,
      target: 'chrome110',
      lib: { entry, name, formats: [format], fileName: () => file },
    },
  });
}

// Static files: manifest.json, popup.html/css, the design tokens, and the logo.
await cp(new URL('../public/', import.meta.url), dist, { recursive: true });
await cp(
  new URL('../../../packages/tokens/tokens.css', import.meta.url),
  new URL('tokens.css', dist),
);
await mkdir(new URL('assets/', dist), { recursive: true });
await cp(new URL('../../../logo.png', import.meta.url), new URL('assets/logo.png', dist));
