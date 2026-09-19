/** Shared domain types used by the catalog, providers, API, and matcher. */

export const RETAILERS = ['amazon', 'cvs', 'kroger', 'walmart'] as const;
export type Retailer = (typeof RETAILERS)[number];

export const PRICE_CONTEXTS = ['online', 'store-pickup', 'in-store'] as const;
export type PriceContext = (typeof PRICE_CONTEXTS)[number];

export type Money = {
  /** Integer minor units. Floating-point dollar amounts never cross this boundary. */
  amountCents: number;
  currency: 'USD';
};

export type Size = {
  amount: number;
  unit: 'oz' | 'ml' | 'count';
};

export type RetailerIdentity = {
  retailer: Retailer;
  productId: string;
  /** Reviewer-approved outbound product URL. */
  canonicalUrl: string;
  canonicalUrlPatterns: string[];
};

export type EquivalencePolicy = 'exact-packaged-product';
export type ProductAudience = 'women' | 'men' | 'unisex';

/** A human-reviewed, same-retailer substitute for the source product. */
export type ReviewedAlternative = {
  productId: string;
  rationale: string;
  matchedAttributes: string[];
  knownDifferences?: string[];
};

export type Product = {
  id: string;
  upc?: string;
  name: string;
  brand?: string;
  variant: string;
  category: 'razors' | 'deodorant' | 'body-wash';
  audience: ProductAudience;
  size: Size;
  identities: RetailerIdentity[];
  equivalence: {
    /** Phase 1 deliberately permits exact identity matching only. */
    policy: EquivalencePolicy;
    rationale: string;
    matchedAttributes: string[];
    knownDifferences?: string[];
  };
  /** Explicit reviewed links only. The matcher never infers alternatives. */
  reviewedAlternatives: ReviewedAlternative[];
  status: 'active' | 'paused' | 'retired';
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
