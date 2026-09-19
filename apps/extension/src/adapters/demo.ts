import { isControlledDemoUrl } from '../shared/config.js';
import {
  isKrogerProductUrl,
  KROGER_BLOCKED_PRICE_SELECTORS,
  krogerProductIdFromUrl,
} from './kroger.js';
import { createStructuredProductAdapter } from './structured-product.js';

/**
 * The controlled fallback page (`apps/demo`, `http://localhost:4174/product/kroger`) publishes the
 * same schema.org Product/Offer data and canonical kroger.com link a Kroger product page does, so
 * it runs through exactly the same extraction as the live adapter. Only the page URL differs: the
 * canonical link must still be a Kroger product URL, and the product id comes from it.
 */
export const krogerDemoAdapter = createStructuredProductAdapter({
  canHandle: isControlledDemoUrl,
  isCanonical: isKrogerProductUrl,
  productIdFromUrl: krogerProductIdFromUrl,
  blockedPriceSelectors: KROGER_BLOCKED_PRICE_SELECTORS,
});
