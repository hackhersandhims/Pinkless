/**
 * The Marketplace's view contract. Every component renders these shapes and
 * nothing else.
 *
 * Adapted from the shared API contract in packages/matcher. Note this differs
 * from an earlier draft that assumed the catalog stored a target/alternative
 * price pair: it does not. The catalog holds product identity and equivalence
 * policy only; both prices come from real provider offers, so savings is a
 * live, computed integer and the "alternative" is the SAME packaged product at
 * a different retailer (not a different product).
 */

import type {
  ComparisonOffer,
  ComparisonsResponse,
  ProductComparison,
} from '../../../../packages/matcher/src/comparison.js';
import type { Money, PriceContext, Product, Retailer, Size } from '../../../../packages/catalog/src/schema.js';

export type {
  ComparisonOffer,
  ComparisonsResponse,
  Money,
  PriceContext,
  Product,
  ProductComparison,
  Retailer,
  Size,
};

/** Fixed display order. Categories with no active comparisons are omitted. */
export const CATEGORY_ORDER = ['razors', 'deodorant', 'body-wash'] as const;
export type CategorySlug = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  razors: 'Razors',
  deodorant: 'Deodorant',
  'body-wash': 'Body wash',
};

export const RETAILER_LABELS: Record<Retailer, string> = {
  cvs: 'CVS',
  kroger: 'Kroger',
  walmart: 'Walmart',
};

/** How a price was fulfilled. Offers are only ever compared within one context. */
export const PRICE_CONTEXT_LABELS: Record<PriceContext, string> = {
  online: 'Online',
  'store-pickup': 'Store pickup',
  'in-store': 'In store',
};

/** One retailer's side of a comparison, flattened for display. */
export type OfferView = {
  retailer: Retailer;
  retailerLabel: string;
  url: string;
  priceCents: number;
  priceContext: PriceContext;
  priceContextLabel: string;
  /** ISO date-time the price was observed. */
  observedAt: string;
};

/**
 * One rendered comparison card. `reference` and `alternative` are the same
 * packaged product at two retailers, in the same price context, with
 * `savingsCents` strictly positive.
 */
export type ComparisonView = {
  id: string;
  category: CategorySlug;
  categoryLabel: string;
  name: string;
  brand?: string;
  variant: string;
  size: Size;
  upc?: string;
  reference: OfferView;
  alternative: OfferView;
  /** Integer minor units, always > 0. */
  savingsCents: number;
  rationale: string;
  matchedAttributes: string[];
  knownDifferences: string[];
};

export type CategoryGroup = {
  slug: CategorySlug;
  label: string;
  items: ComparisonView[];
};
