/**
 * The Marketplace's data and view contracts. Every component renders the view
 * shapes and nothing else.
 *
 * The catalog holds product identity and equivalence policy only; both prices
 * come from real provider offers, so savings is a computed integer and the
 * "alternative" is the SAME packaged product at a different retailer.
 */

import type { Offer, PriceContext, Product, Retailer, Size } from '../../../../packages/catalog/src/schema.js';

export type { Money, Offer, PriceContext, Product, Retailer, Size } from '../../../../packages/catalog/src/schema.js';

/**
 * One side of a listed comparison: a provider offer reduced to what the
 * Marketplace displays.
 */
export type ComparisonOffer = Pick<
  Offer,
  'retailer' | 'url' | 'price' | 'priceContext' | 'locationId' | 'observedAt' | 'expiresAt'
> & { availability: 'in-stock' };

/**
 * One product and a cheaper offer for it at another supported retailer. Each
 * entry is a `show` outcome from packages/matcher's `compareOffers()`, so the
 * Marketplace lists exactly what the extension would badge.
 */
export type ProductComparison = {
  /** `Product.id` from packages/catalog. */
  productId: string;
  upc?: string;
  name: string;
  brand?: string;
  variant: string;
  category: Product['category'];
  size: Size;
  equivalence: Product['equivalence'];
  reference: ComparisonOffer;
  alternative: ComparisonOffer;
  /** Integer minor units, always > 0. */
  savingsCents: number;
};

/**
 * The Marketplace's list feed. The Phase 2 API has no list endpoint yet
 * (`POST /api/compare` answers one product view at a time), so this shape is
 * the proposed body for a future `GET /api/comparisons`.
 */
export type ComparisonsResponse = {
  comparisons: ProductComparison[];
  /** ISO date-time the feed was assembled. */
  generatedAt: string;
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
