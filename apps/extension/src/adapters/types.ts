import type { SelectedStore } from '../shared/settings.js';
import type { ProductView } from '../shared/types.js';

export type { ProductView } from '../shared/types.js';

export type PageLocation = Pick<Location, 'href'>;

/**
 * One adapter per page source (TASKS.md Phase 3). `extract` returns null for anything that is not
 * a complete, ordinary, one-time-priced Kroger product page — ads, search/category pages,
 * quick-view modals, sale/coupon/membership prices, incomplete data — and whenever no Kroger store
 * has been selected. Null means silence.
 *
 * The store is the person's choice in the popup, not something read from the page: the API prices
 * both products at that store, and the page price is only a consistency check.
 */
export type PageLocation = Pick<Location, 'href'>;

/** Extracts only trusted product-page data; ambiguous pages return null. */
export interface RetailerAdapter {
  readonly retailer: ProductView['retailer'];
  canHandle(url: URL): boolean;
  extract(document: Document, location: PageLocation, store?: SelectedStore): ProductView | null;
};
