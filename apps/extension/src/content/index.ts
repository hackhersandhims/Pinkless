import { ADAPTERS, extractProductView } from '../adapters/index.js';
import { loadSettings, STORE_KEY, type SelectedStore } from '../shared/settings.js';
import { requestComparison } from './api.js';
import { createController } from './controller.js';
import { diagnostic } from './diagnostics.js';
import { createBadgeSurface } from './surface.js';

// Content-script entry (bundled to dist/content/index.js by scripts/build.mjs).
//
//   Kroger page adapter + selected store -> POST /api/compare (via background) -> toBadgeModel
//   -> one badge in one Shadow DOM root
//
// Safe to run more than once in a page: the surface hands the single badge root to the newest
// instance and older ones stop themselves. Matching and eligibility stay in packages/matcher and
// apps/api; this file only wires the pieces together.

// The extension API object disappears when the extension is reloaded or removed; an orphaned
// script must go quiet rather than throw into the retailer's page.
const extensionContextAlive = (): boolean =>
  Boolean((globalThis as { chrome?: { runtime?: { id?: string } } }).chrome?.runtime?.id);

let store: SelectedStore | undefined;

const controller = createController({
  // No selected store -> null -> no badge (and any existing badge is removed).
  getProductView: () => extractProductView(ADAPTERS, document, location, store),
  compare: (view) => requestComparison(view),
  surface: createBadgeSurface(),
  isContextAlive: extensionContextAlive,
});

// A store chosen or cleared in the popup changes the comparison; re-evaluate (debounced).
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !(STORE_KEY in changes)) return;
  void loadSettings()
    .then((settings) => {
      store = settings.store;
      controller.refresh();
    })
    .catch((error: unknown) => diagnostic('could not reload the selected store', error));
});

loadSettings()
  .then((settings) => {
    store = settings.store;
  })
  .catch((error: unknown) => diagnostic('could not load the selected store', error))
  .finally(() => controller.start());
