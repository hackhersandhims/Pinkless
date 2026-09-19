/** Shared domain types used by the catalog, providers, API, and matcher. */

/** Kroger is the only supported retailer (REQUIREMENTS §1, §2). */
export const RETAILERS = ['kroger'] as const;
export type Retailer = (typeof RETAILERS)[number];

export const PRICE_CONTEXTS = ['online', 'store-pickup', 'in-store'] as const;
export type PriceContext = (typeof PRICE_CONTEXTS)[number];

/** Store-specific contexts; comparisons are always within one store. */
export const STORE_PRICE_CONTEXTS = ['in-store', 'store-pickup'] as const;
export type StorePriceContext = (typeof STORE_PRICE_CONTEXTS)[number];

export type Money = {
  /** Integer minor units. Floating-point dollar amounts never cross this boundary. */
  amountCents: number;
  currency: 'USD';
};

export const CATEGORIES = [
  'razors',
  'deodorant',
  'body-wash',
  'shave-care',
  'lotion',
  'face-care',
  'hair-care',
  'soap',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Size = {
  amount: number;
  unit: 'oz' | 'ml' | 'count';
};

/**
 * Who the retailer or manufacturer markets the product to, as stated on the
 * listing or package. A factual label, not a claim about why prices differ.
 */
export const MARKETED_TO = ['women', 'men', 'neutral'] as const;
export type MarketedTo = (typeof MARKETED_TO)[number];

export type RetailerIdentity = {
  retailer: Retailer;
  /** Kroger's 13-digit productId. */
  productId: string;
  /** Reviewer-approved outbound product URL. */
  canonicalUrl: string;
  canonicalUrlPatterns: string[];
};

/**
 * One canonical packaged item. A product is only ever compared through a
 * reviewed `ProductEquivalence` record, never on its own.
 */
export type Product = {
  id: string;
  upc?: string;
  name: string;
  brand?: string;
  variant: string;
  category: Category;
  size: Size;
  marketedTo: MarketedTo;
  identities: RetailerIdentity[];
  status: 'active' | 'paused' | 'retired';
};

/**
 * A reviewed link between a product marketed to women and a comparable men's
 * or neutral product. The comparison only runs in that direction: it shows on
 * the women's product when the other one costs less at the same store.
 */
export type ProductEquivalence = {
  id: string;
  productIds: [string, string];
  /** What makes the two products comparable, in plain terms. */
  rationale: string;
  matchedAttributes: string[];
  /** Required and non-empty: every pair of different products differs somehow. */
  knownDifferences: string[];
  reviewedBy: string;
  /** ISO date (YYYY-MM-DD). */
  reviewedAt: string;
  status: 'active' | 'paused' | 'retired';
};

export type Catalog = {
  products: Product[];
  equivalences: ProductEquivalence[];
};

/** A time-bounded price observation returned by an approved provider. */
export type Offer = {
  retailer: Retailer;
  productId: string;
  url: string;
  price: Money;
  priceContext: PriceContext;
  condition: 'new';
  availability: 'in-stock' | 'out-of-stock' | 'unknown';
  locationId?: string;
  observedAt: string;
  expiresAt: string;
};
