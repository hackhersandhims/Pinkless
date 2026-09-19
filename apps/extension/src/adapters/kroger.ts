import { createStructuredProductAdapter } from './structured-product.js';

const PRODUCT_PATH = /^\/p\/[a-z0-9-]+\/(\d{8,20})\/?$/i;

/** Only the explicit www host the manifest declares; no lookalikes, no other subdomains. */
function isKrogerProductUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    url.hostname === 'www.kroger.com' &&
    PRODUCT_PATH.test(url.pathname)
  );
}

export function krogerProductIdFromUrl(url: URL): string | undefined {
  return url.pathname.match(PRODUCT_PATH)?.[1];
}

export const KROGER_BLOCKED_PRICE_SELECTORS = [
  '[data-testid="coupon-price"][data-applied="true"]',
  '[data-testid="promotion-price"][data-applied="true"]',
  '[data-testid="membership-price"][aria-checked="true"]',
  '[data-price-type="membership"]',
  '[data-price-type="promo"]',
];

export const krogerAdapter = createStructuredProductAdapter({
  canHandle: isKrogerProductUrl,
  isCanonical: isKrogerProductUrl,
  productIdFromUrl: krogerProductIdFromUrl,
  blockedPriceSelectors: KROGER_BLOCKED_PRICE_SELECTORS,
});

export { isKrogerProductUrl };
