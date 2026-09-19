import { ADAPTERS, extractProductView } from '../adapters/index.js';
import {
  loadSettings,
  POSTAL_CODE_KEY,
  STORE_KEY,
  type SelectedStore,
} from '../shared/settings.js';
import { requestComparison, requestStores } from './api.js';
import { createController } from './controller.js';
import { diagnostic } from './diagnostics.js';
import { matchKrogerPageStore, readKrogerPageStore } from './kroger-store.js';
import { createBadgeSurface } from './surface.js';

// Content-script entry (bundled to dist/content/index.js by scripts/build.mjs).
//
//   Kroger page store + ZIP lookup -> product adapter -> POST /api/compare (via background)
//   -> toBadgeModel
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
let postalCode: string | undefined;
let pageStoreKey: string | undefined;
let pageStoreTimer: ReturnType<typeof setTimeout> | undefined;

function pageStoreFingerprint(): string | undefined {
  const pageStore = readKrogerPageStore(document);
  return pageStore ? `${pageStore.name}\u0000${pageStore.addressLine1}` : undefined;
}

async function syncKrogerPageStore(): Promise<void> {
  const pageStore = readKrogerPageStore(document);
  const nextKey = pageStore ? `${pageStore.name}\u0000${pageStore.addressLine1}` : undefined;
  if (nextKey === pageStoreKey) return;
  pageStoreKey = nextKey;
  // A changed or incomplete website store immediately suppresses any old-store badge.
  store = undefined;
  controller.refresh();
  if (!pageStore || !postalCode) return;

  try {
    const locations = await requestStores(postalCode);
    // Discard an answer if Kroger changed its selected store while the lookup was in flight.
    if (pageStoreFingerprint() !== nextKey) return;
    store = locations ? matchKrogerPageStore(pageStore, locations) : undefined;
    controller.refresh();
  } catch (error) {
    diagnostic('could not resolve Kroger page store', error);
  }
}

function scheduleKrogerPageStoreSync(): void {
  clearTimeout(pageStoreTimer);
  pageStoreTimer = setTimeout(() => void syncKrogerPageStore(), 300);
}

const controller = createController({
  // No resolved Kroger page store -> null -> no badge (and any existing badge is removed).
  getProductView: () => extractProductView(ADAPTERS, document, location, store),
  compare: (view) => requestComparison(view),
  surface: createBadgeSurface(),
  isContextAlive: extensionContextAlive,
});

// A ZIP change can resolve the visible Kroger store differently; re-evaluate (debounced).
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || (!(STORE_KEY in changes) && !(POSTAL_CODE_KEY in changes))) return;
  void loadSettings()
    .then((settings) => {
      postalCode = settings.postalCode;
      scheduleKrogerPageStoreSync();
    })
    .catch((error: unknown) => diagnostic('could not reload Kroger store settings', error));
});

loadSettings()
  .then((settings) => {
    postalCode = settings.postalCode;
    // The saved store is kept only for the controlled local fallback. On Kroger, the page store
    // takes priority and an unknown page store remains silent.
    if (location.hostname !== 'www.kroger.com') store = settings.store;
    void syncKrogerPageStore();
  })
  .catch((error: unknown) => diagnostic('could not load Kroger store settings', error))
  .finally(() => controller.start());

const pageStoreObserver = new MutationObserver(scheduleKrogerPageStoreSync);
pageStoreObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['aria-label'],
});
