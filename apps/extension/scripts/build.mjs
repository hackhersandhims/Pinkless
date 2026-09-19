import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

const extensionRoot = new URL('../', import.meta.url);
const dist = new URL('dist/', extensionRoot);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await mkdir(new URL('assets/', dist), { recursive: true });
await cp(new URL('public/', extensionRoot), dist, { recursive: true });
await cp(
  new URL('../../../logo.png', import.meta.url),
  new URL('assets/logo.png', dist),
  { recursive: true },
);
await cp(
  new URL('../../../packages/tokens/tokens.css', import.meta.url),
  new URL('tokens.css', dist),
);

const sharedOptions = {
  bundle: true,
  target: ['chrome120'],
  platform: 'browser',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
};

await Promise.all([
  build({
    ...sharedOptions,
    entryPoints: [new URL('src/content/index.ts', extensionRoot).pathname],
    outfile: new URL('content/index.js', dist).pathname,
    format: 'iife',
  }),
  build({
    ...sharedOptions,
    entryPoints: [new URL('src/popup/index.ts', extensionRoot).pathname],
    outfile: new URL('popup/index.js', dist).pathname,
    format: 'iife',
  }),
  build({
    ...sharedOptions,
    entryPoints: [new URL('src/background/index.ts', extensionRoot).pathname],
    outfile: new URL('background/index.js', dist).pathname,
    format: 'esm',
  }),
]);
