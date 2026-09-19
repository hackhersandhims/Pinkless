import type { Money, Offer, PriceContext, Product, Retailer } from '../../catalog/src/schema.js';

/**
 * A normalized view of the current retailer product page. This is produced by
 * a retailer adapter and deliberately permits incomplete data: the matcher
 * fails closed whenever a required value is absent or ambiguous.
 */
export type ProductView = {
  retailer: Retailer;
  canonicalUrl: string;
  productId?: string;
  upc?: string;
  title: string;
  selectedVariant?: string;
  currentPriceCents?: number;
  currency?: string;
  priceContext?: PriceContext;
  locationId?: string;
  availability: 'in-stock' | 'out-of-stock' | 'unknown';
};

export type IdentityMatchMethod = 'upc' | 'retailer-product-id' | 'canonical-url';

export type SuppressionReason =
  | 'identity-conflict'
  | 'variant-conflict'
  | 'invalid-current-price'
  | 'invalid-currency'
  | 'current-unavailable'
  | 'missing-price-context'
  | 'unsupported-price-context'
  | 'missing-location'
  | 'current-offer-unavailable'
  | 'page-price-mismatch'
  | 'provider-unavailable'
  | 'provider-timeout'
  | 'provider-rate-limited'
  | 'invalid-provider-response'
  | 'invalid-request'
  | 'origin-not-allowed';

export type NoMatchReason =
  'unknown-product' | 'no-equivalent' | 'no-eligible-offer' | 'no-positive-savings';

export type ProductSummary = Pick<
  Product,
  'id' | 'name' | 'brand' | 'variant' | 'size' | 'category' | 'marketedTo'
>;

/**
 * A women's product (`product`/`current`) and its reviewed men's or neutral
 * equivalent (`alternativeProduct`/`alternative`), both priced by the provider
 * at the same store in the same price context. `current` always costs more.
 */
export type ShowOutcome = {
  status: 'show';
  equivalenceId: string;
  product: ProductSummary;
  current: Offer;
  alternativeProduct: ProductSummary;
  alternative: Offer;
  /**
   * What the shopper saves for the women's product's amount: its price minus
   * the alternative's price scaled to that amount (rounded up). With equal
   * sizes this is the plain price difference.
   */
  savings: Money;
  /** `same-size`: identical amounts. `per-unit`: same unit, different amounts. */
  basis: 'same-size' | 'per-unit';
  rationale: string;
  matchedAttributes: string[];
  knownDifferences: string[];
  /** How the shopper's page was identified; absent for list comparisons. */
  matchedBy?: IdentityMatchMethod;
};

export type ComparisonOutcome =
  | ShowOutcome
  | { status: 'no-match'; reason: NoMatchReason }
  | { status: 'suppressed'; reason: SuppressionReason };

/** The store and price context every offer in one comparison must share. */
export type StoreContext = {
  locationId: string;
  priceContext: PriceContext;
};
