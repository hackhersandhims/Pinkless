import type { ProductView } from '../shared/types.js';

/**
 * One adapter per retailer (TASKS.md Phase 3). `extract` returns null for anything that is not a
 * complete, ordinary, one-time-priced product page: ads, search/category pages, quick-view
 * modals, sale/subscription/"from" prices, incomplete data. Null means silence.
 */
export type RetailerAdapter = {
  canHandle(url: URL): boolean;
  extract(document: Document, location: Location): ProductView | null;
};
