import { ADAPTERS, extractProductView } from '../adapters/index.js';
import { requestComparison } from './comparison.js';
import { createController } from './controller.js';
import { createBadgeSurface } from './surface.js';

// Content-script entry (bundled to dist/content/index.js by scripts/build.mjs).
//
//   page adapter -> requestComparison (API) -> toBadgeModel -> badge in one Shadow DOM root
//
// Safe to run more than once in a page: the surface hands the single badge root to the newest
// instance and older ones stop themselves. Matching and eligibility stay in packages/matcher and
// apps/api; this file only wires the pieces together.

// The extension API object disappears when the extension is reloaded or removed; an orphaned
// script must go quiet rather than throw into the retailer's page.
const extensionContextAlive = (): boolean =>
  Boolean((globalThis as { chrome?: { runtime?: { id?: string } } }).chrome?.runtime?.id);

createController({
  getProductView: () => extractProductView(ADAPTERS, document, location),
  compare: requestComparison,
  surface: createBadgeSurface(),
  isContextAlive: extensionContextAlive,
}).start();
