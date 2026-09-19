import type { ProductView } from '../shared/types.js';

/**
 * One adapter per retailer (TASKS.md Phase 3). `extract` returns null for anything that is not a
 * complete, ordinary, one-time-priced product page: ads, search/category pages, quick-view
 * modals, sale/subscription/"from" prices, incomplete data. Null means silence.
 */
export type PageLocation = Pick<Location, 'href'>;

/** Extracts only trusted product-page data; ambiguous pages return null. */
export interface RetailerAdapter {
  readonly retailer: ProductView['retailer'];
  canHandle(url: URL): boolean;
  extract(document: Document, location: PageLocation): ProductView | null;
}

export type { ProductView } from '../shared/types.js';
