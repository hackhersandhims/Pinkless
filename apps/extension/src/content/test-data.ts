import type { ShowComparison } from '../shared/types.js';

export function showComparison(overrides: Partial<ShowComparison> = {}): ShowComparison {
  const observedAt = new Date(Date.now() - 60_000).toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  return {
    status: 'show',
    product: {
      id: 'razor-5blade-cartridge-4ct',
      name: 'Sample Razor',
      brand: 'Sample Brand',
      variant: '5-blade cartridge razor, 4 ct',
      size: { amount: 4, unit: 'count' },
    },
    current: {
      retailer: 'cvs',
      price: { amountCents: 1299, currency: 'USD' },
      priceContext: 'store-pickup',
      locationId: 'cvs-1001',
    },
    alternative: {
      retailer: 'walmart',
      productId: 'walmart-razor-1',
      url: 'https://www.walmart.com/ip/sample-razor/walmart-razor-1',
      price: { amountCents: 899, currency: 'USD' },
      priceContext: 'store-pickup',
      condition: 'new',
      availability: 'in-stock',
      locationId: 'walmart-1001',
      observedAt,
      expiresAt,
    },
    savings: { amountCents: 400, currency: 'USD' },
    rationale: 'Same manufacturer UPC and packaged quantity.',
    matchedBy: 'upc',
    ...overrides,
  };
}
