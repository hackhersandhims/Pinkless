/**
 * Shared, reviewer-maintained data model for Pinkless comparisons.
 * Monetary values are stored as integer minor units; never use floating point
 * values for prices or savings.
 */

export type Money = {
  amountCents: number;
  currency: 'USD';
};

export type Size = {
  amount: number;
  unit: 'oz' | 'ml' | 'count';
};

export type TargetListing = {
  retailer: string;
  productId?: string;
  canonicalUrlPatterns: string[];
  name: string;
  brand?: string;
  variant: string;
  marketedAs: 'women' | 'men' | 'unisex';
  size: Size;
};

export type AlternativeListing = {
  retailer: string;
  url: string;
  name: string;
  price: Money;
  size: Size;
  condition: 'new';
  availability: 'verified-in-stock';
};

export type Comparison = {
  id: string;
  category: 'razors' | 'deodorant' | 'body-wash';
  target: TargetListing;
  alternative: AlternativeListing;
  equivalence: {
    rationale: string;
    matchedAttributes: string[];
    knownDifferences?: string[];
  };
  evidence: {
    /** ISO 8601 date recorded by the reviewer. */
    verifiedAt: string;
    sourceUrls: string[];
  };
  status: 'active' | 'paused' | 'retired';
};
