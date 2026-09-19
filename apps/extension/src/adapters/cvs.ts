import { createStructuredProductAdapter } from './structured-product.js';

function isCvsHost(hostname: string): boolean {
  return hostname === 'cvs.com' || hostname.endsWith('.cvs.com');
}

function productPathId(url: URL): string | undefined {
  const selectedSku = url.searchParams.get('skuId');
  if (selectedSku && /^[a-z0-9-]{3,64}$/i.test(selectedSku)) return selectedSku;
  return url.pathname.match(/-prodid-([a-z0-9-]{3,64})\/?$/i)?.[1];
}

export const cvsAdapter = createStructuredProductAdapter({
  retailer: 'cvs',
  canHandle: (url) =>
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    isCvsHost(url.hostname) &&
    /^\/shop\/[a-z0-9-]+-prodid-[a-z0-9-]{3,64}\/?$/i.test(url.pathname),
  productIdFromUrl: productPathId,
  blockedPriceSelectors: [
    '[data-testid="carepass-price"][aria-checked="true"]',
    '[data-testid="subscription-option"][aria-checked="true"]',
    '[data-testid="promotion-price"][data-applied="true"]',
    '[data-price-type="membership"]',
  ],
});
