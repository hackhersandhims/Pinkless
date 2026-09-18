import type { PriceContext, Retailer } from '../../catalog/src/schema.js';

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
