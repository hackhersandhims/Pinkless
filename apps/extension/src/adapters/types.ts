import type { SelectedStore } from '../shared/settings.js';
import type { ProductView } from '../shared/types.js';

export type { ProductView } from '../shared/types.js';

export type PageLocation = Pick<Location, 'href'>;

/**
 * One adapter per page source (TASKS.md Phase 3). `extract` returns null for anything that is not
 * a complete, ordinary, one-time-priced Kroger product page — ads, search/category pages,
 * quick-view modals, sale/coupon/membership prices, incomplete data — and whenever Kroger's
 * visible store cannot be resolved to one official location. Null means silence.
 *
 * On kroger.com, the store comes from Kroger's own visible Pickup/Delivery selector and is matched
 * through the official locations API using the saved ZIP. The API prices both products at that
 * store, and the page price is only a consistency check.
 */
export type RetailerAdapter = {
  canHandle(url: URL): boolean;
  extract(document: Document, location: PageLocation, store?: SelectedStore): ProductView | null;
};
