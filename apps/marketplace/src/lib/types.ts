/**
 * The Marketplace's data and view contracts. Every component renders the view
 * shapes and nothing else.
 *
 * A comparison is a product marketed to women and a reviewed men's or neutral
 * equivalent, both priced by Kroger's official API at the same store in the
 * same price context. The API only lists a pair when the other version costs
 * less, so savings is always a positive integer number of cents.
 */

import type { MarketedTo, PriceContext, Size } from '../../../../packages/catalog/src/schema.js';
import type { ShowOutcome, StoreContext } from '../../../../packages/matcher/src/types.js';

export type {
  MarketedTo,
  Money,
  Offer,
  PriceContext,
  Product,
  Size,
} from '../../../../packages/catalog/src/schema.js';
export type {
  ProductSummary,
  ShowOutcome,
  StoreContext,
} from '../../../../packages/matcher/src/types.js';

/** `GET /api/comparisons?locationId=…&priceContext=in-store`, success body. */
export type ComparisonsResponse = {
  status: 'ok';
  store: StoreContext;
  comparisons: ShowOutcome[];
  /** ISO date-time the feed was assembled. */
  generatedAt: string;
};

/** One Kroger store from `GET /api/stores?postalCode=…`. */
export type StoreLocation = {
  retailer: 'kroger';
  locationId: string;
  name: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
};

/** The store chosen by the shopper. Lives only in the URL query. */
export type SelectedStore = {
  locationId: string;
  /** Display name carried in the URL; absent when only the ID is known. */
  name?: string;
};

/** Fixed display order. Categories with no active comparisons are omitted. */
export const CATEGORY_ORDER = ['razors', 'deodorant', 'body-wash'] as const;
export type CategorySlug = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  razors: 'Razors',
  deodorant: 'Deodorant',
  'body-wash': 'Body wash',
};

/** Factual marketing labels, as stated on the listing. Never a claim about pricing. */
export const MARKETED_TO_LABELS: Record<MarketedTo, string> = {
  women: 'Marketed to women',
  men: 'Marketed to men',
  neutral: 'Not gender-marketed',
};

/** How the cheaper product is named in a headline ("the men’s version"). */
export const VERSION_LABELS: Record<Exclude<MarketedTo, 'women'>, string> = {
  men: 'men’s version',
  neutral: 'neutral version',
};

/** How a price was fulfilled. Offers are only ever compared within one context. */
export const PRICE_CONTEXT_LABELS: Record<PriceContext, string> = {
  online: 'Online',
  'store-pickup': 'Store pickup',
  'in-store': 'In store',
};

/** One product in a comparison, flattened for display. */
export type ProductSide = {
  /** `Product.id` from packages/catalog. */
  id: string;
  /** Kroger's 13-digit product ID (`Offer.productId`). */
  krogerProductId: string;
  name: string;
  brand?: string;
  variant: string;
  size: Size;
  marketedTo: MarketedTo;
  marketedToLabel: string;
  /** The product's Kroger listing. */
  url: string;
  priceCents: number;
  /** ISO date-time Kroger's price was observed. */
  observedAt: string;
};

/**
 * One rendered comparison. `womens` always costs more than `other`, both at
 * `store` in `priceContext`, and `savingsCents` is exactly their difference.
 */
export type ComparisonView = {
  /** The equivalence record ID; also the /compare/:id slug. */
  id: string;
  category: CategorySlug;
  categoryLabel: string;
  womens: ProductSide;
  other: ProductSide & { marketedTo: 'men' | 'neutral' };
  /** "men’s version" or "neutral version". */
  versionLabel: string;
  store: SelectedStore;
  priceContext: PriceContext;
  priceContextLabel: string;
  /** The older of the two price observations, shown as "Checked …". */
  observedAt: string;
  /** Integer minor units, always > 0. */
  savingsCents: number;
  /** Whole-number percent the other version is below the women's price, when ≥ 1. */
  percentLower?: number;
  rationale: string;
  matchedAttributes: string[];
  knownDifferences: string[];
};

export type CategoryGroup = {
  slug: CategorySlug;
  label: string;
  items: ComparisonView[];
};
