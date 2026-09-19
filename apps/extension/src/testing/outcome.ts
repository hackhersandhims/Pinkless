import type { ComparisonOutcome, ProductView } from '../shared/types.js';

export type ShowOutcome = Extract<ComparisonOutcome, { status: 'show' }>;

/** A fixed "now" inside the fixture offer's validity window. */
export const NOW = new Date('2026-09-18T18:00:00.000Z');

/** A fully valid same-retailer outcome: Kroger women $14.99 vs men $12.59. */
export function makeShowOutcome(mutate?: (outcome: ShowOutcome) => void): ShowOutcome {
  const outcome: ShowOutcome = {
    status: 'show',
    product: {
      id: 'razor-5blade-cartridge-4ct',
      name: 'Sample Razor',
      brand: 'Acme',
      variant: '5-blade cartridge razor, 4 ct',
      size: { amount: 4, unit: 'count' },
      audience: 'women',
    },
    alternativeProduct: {
      id: 'mens-razor-5blade-cartridge-4ct',
      name: "Men's Sample Razor",
      brand: 'Acme',
      variant: '5-blade cartridge razor, 4 ct',
      size: { amount: 4, unit: 'count' },
      audience: 'men',
    },
    current: {
      retailer: 'kroger',
      price: { amountCents: 1499, currency: 'USD' },
      priceContext: 'online',
    },
    alternative: {
      retailer: 'kroger',
      productId: '123',
      url: 'https://www.kroger.com/p/mens-sample-razor/123',
      price: { amountCents: 1259, currency: 'USD' },
      priceContext: 'online',
      condition: 'new',
      availability: 'in-stock',
      observedAt: '2026-09-18T12:00:00.000Z',
      expiresAt: '2026-09-19T12:00:00.000Z',
    },
    savings: { amountCents: 240, currency: 'USD' },
    rationale: "Reviewed men's alternative with the same blade count and packaged quantity.",
    matchedAttributes: ['blade count', 'pack count'],
    matchedBy: 'upc',
  };
  mutate?.(outcome);
  return outcome;
}

export function makeProductView(overrides: Partial<ProductView> = {}): ProductView {
  return {
    retailer: 'kroger',
    canonicalUrl: 'https://www.kroger.com/p/sample-razor/0001',
    productId: '0001',
    upc: '012345678905',
    title: 'Sample Razor 4 ct',
    selectedVariant: '4 ct',
    currentPriceCents: 1499,
    currency: 'USD',
    priceContext: 'online',
    availability: 'in-stock',
    ...overrides,
  };
}
