import { createStructuredProductAdapter } from './structured-product.js';

function isKrogerHost(hostname: string): boolean {
  return hostname === 'kroger.com' || hostname.endsWith('.kroger.com');
}

function productPathId(url: URL): string | undefined {
  return url.pathname.match(/\/p\/[a-z0-9-]+\/(\d{8,20})\/?$/i)?.[1];
}

export const krogerAdapter = createStructuredProductAdapter({
  retailer: 'kroger',
  canHandle: (url) =>
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    isKrogerHost(url.hostname) &&
    /^\/p\/[a-z0-9-]+\/\d{8,20}\/?$/i.test(url.pathname),
  productIdFromUrl: productPathId,
  blockedPriceSelectors: [
    '[data-testid="coupon-price"][data-applied="true"]',
    '[data-testid="promotion-price"][data-applied="true"]',
    '[data-testid="membership-price"][aria-checked="true"]',
    '[data-price-type="membership"]',
  ],
});
