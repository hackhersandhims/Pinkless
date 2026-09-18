import { describe, expect, it } from 'vitest';
import type { Offer, Product, Retailer } from '../../catalog/src/schema.js';
import { compareOffers } from './compare.js';
import { resolveProduct } from './resolve.js';
import type { ProductView } from './types.js';

function product(id = 'sample-razor', upc = '012345678905'): Product {
  const identity = (retailer: Retailer, productId: string, url: string) => ({
    retailer,
    productId,
    canonicalUrl: url,
    canonicalUrlPatterns: [`^${url.replaceAll('.', '\\.').replaceAll('/', '\\/')}$`],
  });
  return {
    id,
    upc,
    name: 'Sample Razor',
    brand: 'Sample Brand',
    variant: 'One handle',
    category: 'razors',
    size: { amount: 1, unit: 'count' },
    identities: [
      identity('cvs', 'cvs-razor-1', 'https://www.cvs.com/shop/cvs-razor-1'),
      identity('kroger', 'kroger-razor-1', 'https://www.kroger.com/p/kroger-razor-1'),
      identity('walmart', 'walmart-razor-1', 'https://www.walmart.com/ip/walmart-razor-1'),
    ],
    equivalence: {
      policy: 'exact-packaged-product',
      rationale: 'All identities use the same UPC and package size.',
      matchedAttributes: ['UPC', 'package size'],
    },
    status: 'active',
  };
}

function current(overrides: Partial<ProductView> = {}): ProductView {
  return {
    retailer: 'cvs',
    canonicalUrl: 'https://www.cvs.com/shop/cvs-razor-1',
    productId: 'cvs-razor-1',
    upc: '012345678905',
    title: 'Sample Razor',
    selectedVariant: 'One handle',
    currentPriceCents: 1299,
    currency: 'USD',
    priceContext: 'store-pickup',
    locationId: 'shared-location',
    availability: 'in-stock',
    ...overrides,
  };
}

function offer(overrides: Partial<Offer> = {}): Offer {
  return {
    retailer: 'kroger',
    productId: 'kroger-razor-1',
    url: 'https://www.kroger.com/p/kroger-razor-1',
    price: { amountCents: 999, currency: 'USD' },
    priceContext: 'store-pickup',
    condition: 'new',
    availability: 'in-stock',
    locationId: 'shared-location',
    observedAt: '2026-09-18T16:00:00.000Z',
    expiresAt: '2026-09-18T17:00:00.000Z',
    ...overrides,
  };
}

const now = new Date('2026-09-18T16:30:00.000Z');

describe('resolveProduct', () => {
  it('resolves by UPC, retailer product ID, then canonical URL', () => {
    const catalog = [product()];
    expect(resolveProduct(catalog, current()).status).toBe('matched');
    expect(resolveProduct(catalog, current({ upc: undefined })).status).toBe('matched');
    expect(
      resolveProduct(catalog, current({ upc: undefined, productId: undefined })),
    ).toMatchObject({ status: 'matched', matchedBy: 'canonical-url' });
  });

  it('suppresses identities that resolve to conflicting products', () => {
    const second = product('other-product', '036602301972');
    second.identities[0]!.productId = 'other-cvs-id';
    expect(
      resolveProduct([product(), second], current({ upc: second.upc, productId: 'cvs-razor-1' })),
    ).toEqual({ status: 'conflict', kind: 'identity-conflict' });
  });
});

describe('compareOffers', () => {
  it('returns an exact savings display model', () => {
    expect(compareOffers([product()], current(), [offer()], now)).toMatchObject({
      status: 'show',
      savings: { amountCents: 300, currency: 'USD' },
      alternative: { retailer: 'kroger', price: { amountCents: 999 } },
      matchedBy: 'upc',
    });
  });

  it.each([
    ['expired', offer({ expiresAt: '2026-09-18T16:29:59.000Z' })],
    ['out of stock', offer({ availability: 'out-of-stock' })],
    ['wrong context', offer({ priceContext: 'in-store' })],
    ['wrong location', offer({ locationId: 'another-store' })],
    ['wrong product', offer({ productId: 'another-product' })],
  ])('suppresses an %s alternative', (_label, candidate) => {
    expect(compareOffers([product()], current(), [candidate], now)).toEqual({
      status: 'no-match',
      reason: 'no-eligible-offer',
    });
  });

  it.each([1299, 1399])('does not show zero or negative savings', (amountCents) => {
    expect(
      compareOffers(
        [product()],
        current(),
        [offer({ price: { amountCents, currency: 'USD' } })],
        now,
      ),
    ).toEqual({ status: 'no-match', reason: 'no-positive-savings' });
  });

  it('suppresses invalid current price, currency, availability, and location', () => {
    expect(compareOffers([product()], current({ currentPriceCents: 0 }), [offer()], now)).toEqual({
      status: 'suppressed',
      reason: 'invalid-current-price',
    });
    expect(compareOffers([product()], current({ currency: 'CAD' }), [offer()], now)).toEqual({
      status: 'suppressed',
      reason: 'invalid-currency',
    });
    expect(
      compareOffers([product()], current({ availability: 'out-of-stock' }), [offer()], now),
    ).toEqual({ status: 'suppressed', reason: 'current-unavailable' });
    expect(compareOffers([product()], current({ locationId: undefined }), [offer()], now)).toEqual({
      status: 'suppressed',
      reason: 'missing-location',
    });
  });

  it('suppresses incompatible selected variants', () => {
    expect(
      compareOffers([product()], current({ selectedVariant: 'Three handles' }), [offer()], now),
    ).toEqual({ status: 'suppressed', reason: 'variant-conflict' });
  });
});
