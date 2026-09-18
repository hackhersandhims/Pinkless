import { createStructuredProductAdapter } from './structured-product.js';

function isWalmartHost(hostname: string): boolean {
  return hostname === 'walmart.com' || hostname.endsWith('.walmart.com');
}

function productPathId(url: URL): string | undefined {
  return url.pathname.match(/\/ip\/(?:[a-z0-9-]+\/)?(\d{3,20})\/?$/i)?.[1];
}

export const walmartAdapter = createStructuredProductAdapter({
  retailer: 'walmart',
  canHandle: (url) =>
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    isWalmartHost(url.hostname) &&
    /^\/ip\/(?:[a-z0-9-]+\/)?\d{3,20}\/?$/i.test(url.pathname),
  productIdFromUrl: productPathId,
  blockedPriceSelectors: [
    '[data-automation-id="subscription-option"][aria-checked="true"]',
    '[data-automation-id="member-price"][data-applied="true"]',
    '[data-automation-id="promotion-price"][data-applied="true"]',
    '[data-price-type="membership"]',
    '[data-price-type="rollback"]',
  ],
  allowedSeller: 'Walmart.com',
});
