/**
 * TEST-ONLY deterministic comparison feed. Builds the same
 * `GET /api/comparisons` body the API returns, by running the reviewed catalog
 * and fixture Kroger offers through packages/matcher's `listComparisons()` —
 * the function behind the real endpoint. The running app never imports this:
 * a failed API call shows an error, not fixture prices.
 */

import productsJson from '../../../../../packages/catalog/products.json';
import equivalencesJson from '../../../../../packages/catalog/equivalences.json';
import { listComparisons } from '../../../../../packages/matcher/src/compare.js';
import type { Catalog, Offer } from '../../../../../packages/catalog/src/schema.js';
import type { ComparisonsResponse } from '../types.js';
import offersJson from './kroger-offers.json';

/** Store where the fixture men's razor costs less (mirrors a live observation). */
export const FIXTURE_STORE_ID = '01400513';
export const FIXTURE_STORE_NAME = 'Kroger - Kroger On the Rhine';
/** Store where both fixture razors cost the same, so nothing is listed. */
export const FIXTURE_EVEN_STORE_ID = 'fixture-even-store';

/** Matcher "now": inside every fixture offer's observed/expiry window. */
export const FIXTURE_NOW = '2026-09-19T14:05:00.000Z';

export const fixtureCatalog = {
  products: productsJson,
  equivalences: equivalencesJson,
} as unknown as Catalog;

export const fixtureOffers = offersJson as Offer[];

export function buildFixtureFeed(locationId: string = FIXTURE_STORE_ID): ComparisonsResponse {
  const store = { locationId, priceContext: 'in-store' as const };
  return {
    status: 'ok',
    store,
    comparisons: listComparisons(fixtureCatalog, fixtureOffers, store, new Date(FIXTURE_NOW)),
    generatedAt: FIXTURE_NOW,
  };
}
