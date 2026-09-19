import { createStructuredProductAdapter } from './structured-product.js';

function isAmazonHost(hostname: string): boolean {
  return hostname === 'amazon.com' || hostname.endsWith('.amazon.com');
}

function productPathId(url: URL): string | undefined {
  return url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase();
}

export const amazonAdapter = createStructuredProductAdapter({
  retailer: 'amazon',
  canHandle: (url) =>
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    isAmazonHost(url.hostname) &&
    /^\/(?:dp|gp\/product)\/[A-Z0-9]{10}(?:\/|$)/i.test(url.pathname),
  productIdFromUrl: productPathId,
  blockedPriceSelectors: [
    '#snsAccordionRowMiddle',
    '[data-csa-c-content-id="sns-accordion"]',
    '[data-feature-name="couponFeature"] input:checked',
    '[data-price-type="subscription"]',
  ],
  allowedSeller: 'Amazon.com',
  defaultPriceContext: 'online',
});
