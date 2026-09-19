import type { ComparisonOutcome, ProductView, ShowOutcome } from '../shared/types.js';

export type { ShowOutcome } from '../shared/types.js';

/** A fixed "now" inside the fixture offers' validity window. */
export const NOW = new Date('2026-09-19T12:30:00.000Z');

const SOLEIL_URL =
  'https://www.kroger.com/p/bic-soleil-smooth-scented-disposable-3-blade-razors/0007033071417';
const COMFORT_URL =
  'https://www.kroger.com/p/bic-comfort-3-advance-disposable-razors/0007033071397';

/**
 * A fully valid `show` outcome for the reviewed BIC pair at one Kroger store: Soleil Smooth
 * (women's) $6.79 vs Comfort 3 Advance (men's) $5.99, both in-store, $0.80 saved.
 */
export function makeShowOutcome(mutate?: (outcome: ShowOutcome) => void): ShowOutcome {
  const offerTimes = {
    observedAt: '2026-09-19T12:00:00.000Z',
    expiresAt: '2026-09-19T18:00:00.000Z',
  };
  const outcome: ShowOutcome = {
    status: 'show',
    basis: 'same-size',
    equivalenceId: 'bic-soleil-smooth-vs-comfort-3-advance',
    product: {
      id: 'bic-soleil-smooth-scented-3blade-4pk',
      name: 'BIC Soleil Smooth Scented Disposable 3-Blade Razors',
      brand: 'BIC',
      variant: '3-blade disposable razor, 4 pk',
      size: { amount: 4, unit: 'count' },
      category: 'razors',
      marketedTo: 'women',
    },
    current: {
      retailer: 'kroger',
      productId: '0007033071417',
      url: SOLEIL_URL,
      price: { amountCents: 679, currency: 'USD' },
      priceContext: 'in-store',
      condition: 'new',
      availability: 'in-stock',
      locationId: 'kroger-1001',
      ...offerTimes,
    },
    alternativeProduct: {
      id: 'bic-comfort-3-advance-4ct',
      name: 'BIC Comfort 3 Advance Disposable Razors',
      brand: 'BIC',
      variant: '3-blade disposable razor, 4 ct',
      size: { amount: 4, unit: 'count' },
      category: 'razors',
      marketedTo: 'men',
    },
    alternative: {
      retailer: 'kroger',
      productId: '0007033071397',
      url: COMFORT_URL,
      price: { amountCents: 599, currency: 'USD' },
      priceContext: 'in-store',
      condition: 'new',
      availability: 'in-stock',
      locationId: 'kroger-1001',
      ...offerTimes,
    },
    savings: { amountCents: 80, currency: 'USD' },
    rationale: 'Both are BIC 3-blade disposable razors sold in a 4-count pack.',
    matchedAttributes: ['brand', 'blade count', 'disposable', 'pack count'],
    knownDifferences: [
      'Soleil Smooth is listed as scented; Comfort 3 Advance is not.',
      'Handle shape and color differ.',
    ],
    matchedBy: 'retailer-product-id',
  };
  mutate?.(outcome);
  return outcome;
}

export function makeProductView(overrides: Partial<ProductView> = {}): ProductView {
  return {
    retailer: 'kroger',
    canonicalUrl: SOLEIL_URL,
    productId: '0007033071417',
    title: 'BIC Soleil Smooth Scented Disposable 3-Blade Razors, 4 ct',
    currentPriceCents: 679,
    currency: 'USD',
    priceContext: 'in-store',
    locationId: 'kroger-1001',
    availability: 'in-stock',
    ...overrides,
  };
}

export type { ComparisonOutcome };
