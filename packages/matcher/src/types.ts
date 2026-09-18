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

/** Explicit retailer store selections that belong to one user location context. */
export type RetailerLocationSelection = Partial<Record<Retailer, string>>;

export type SuppressionReason =
  | 'identity-conflict'
  | 'variant-conflict'
  | 'invalid-current-price'
  | 'invalid-currency'
  | 'current-unavailable'
  | 'missing-price-context'
  | 'missing-location'
  | 'provider-unavailable'
  | 'provider-timeout'
  | 'provider-rate-limited'
  | 'invalid-provider-response'
  | 'invalid-request'
  | 'origin-not-allowed';

export type NoMatchReason =
  'unknown-product' | 'no-alternative-identity' | 'no-eligible-offer' | 'no-positive-savings';

export type ComparisonOutcome =
  | {
      status: 'show';
      product: Pick<Product, 'id' | 'name' | 'brand' | 'variant' | 'size'>;
      current: {
        retailer: Retailer;
        price: Money;
        priceContext: PriceContext;
        locationId?: string;
      };
      alternative: Offer;
      savings: Money;
      rationale: string;
      matchedBy: IdentityMatchMethod;
    }
  | { status: 'no-match'; reason: NoMatchReason }
  | { status: 'suppressed'; reason: SuppressionReason };
