import { describe, expect, it } from 'vitest';
import type { Catalog, Offer, Product, ProductEquivalence } from '../../catalog/src/schema.js';
import { compareOffers, equivalentsFor, listComparisons } from './compare.js';
import { resolveProduct } from './resolve.js';
import type { ProductView } from './types.js';

const STORE = 'kroger-1001';

function product(id: string, productId: string, overrides: Partial<Product> = {}): Product {
  const url = `https://www.kroger.com/p/${id}/${productId}`;
  return {
    id,
    name: `Product ${id}`,
    brand: 'Sample Brand',
    variant: '3-blade disposable razor, 4 ct',
    category: 'razors',
    size: { amount: 4, unit: 'count' },
    marketedTo: id === 'pricier' ? 'women' : 'men',
    identities: [
      {
        retailer: 'kroger',
        productId,
        canonicalUrl: url,
        canonicalUrlPatterns: [`^https://www\\.kroger\\.com/p/[a-z0-9-]+/${productId}$`],
      },
    ],
    status: 'active',
    ...overrides,
  };
}

function equivalence(
  productIds: [string, string] = ['pricier', 'cheaper'],
  overrides: Partial<ProductEquivalence> = {},
): ProductEquivalence {
  return {
    id: `${productIds[0]}-vs-${productIds[1]}`,
    productIds,
    rationale: 'Both are 3-blade disposable razors in a 4-count pack.',
    matchedAttributes: ['blade count', 'pack count'],
    knownDifferences: ['Handle color differs.'],
    reviewedBy: 'reviewer',
    reviewedAt: '2026-09-18',
    status: 'active',
    ...overrides,
  };
}

function catalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    products: [product('pricier', '0000000000001'), product('cheaper', '0000000000002')],
    equivalences: [equivalence()],
    ...overrides,
  };
}

function view(overrides: Partial<ProductView> = {}): ProductView {
  return {
    retailer: 'kroger',
    canonicalUrl: 'https://www.kroger.com/p/pricier/0000000000001',
    productId: '0000000000001',
    title: 'Product pricier',
    currentPriceCents: 679,
    currency: 'USD',
    priceContext: 'in-store',
    locationId: STORE,
    availability: 'in-stock',
    ...overrides,
  };
}

function offer(productId: string, amountCents: number, overrides: Partial<Offer> = {}): Offer {
  const id = productId.endsWith('1') ? 'pricier' : productId.endsWith('2') ? 'cheaper' : 'other';
  return {
    retailer: 'kroger',
    productId,
    url: `https://www.kroger.com/p/${id}/${productId}`,
    price: { amountCents, currency: 'USD' },
    priceContext: 'in-store',
    condition: 'new',
    availability: 'in-stock',
    locationId: STORE,
    observedAt: '2026-09-18T16:00:00.000Z',
    expiresAt: '2026-09-18T17:00:00.000Z',
    ...overrides,
  };
}

const pricierOffer = offer('0000000000001', 679);
const cheaperOffer = offer('0000000000002', 599);
const now = new Date('2026-09-18T16:30:00.000Z');

describe('resolveProduct', () => {
  it('resolves by Kroger product ID, then canonical URL', () => {
    const { products } = catalog();
    expect(resolveProduct(products, view())).toMatchObject({
      status: 'matched',
      matchedBy: 'retailer-product-id',
    });
    expect(resolveProduct(products, view({ productId: undefined }))).toMatchObject({
      status: 'matched',
      matchedBy: 'canonical-url',
    });
  });
});

describe('equivalentsFor', () => {
  it("only runs from the women's product to the men's or neutral one", () => {
    expect(equivalentsFor(catalog(), 'pricier').map(({ product }) => product.id)).toEqual([
      'cheaper',
    ]);
    expect(equivalentsFor(catalog(), 'cheaper')).toEqual([]);
    const neutral = catalog();
    neutral.products[1] = product('cheaper', '0000000000002', { marketedTo: 'neutral' });
    expect(equivalentsFor(neutral, 'pricier').map(({ product }) => product.id)).toEqual([
      'cheaper',
    ]);
    const bothWomens = catalog();
    bothWomens.products[1] = product('cheaper', '0000000000002', { marketedTo: 'women' });
    expect(equivalentsFor(bothWomens, 'pricier')).toEqual([]);
  });

  it('ignores paused pairs, inactive counterparts, and mismatched sizes or categories', () => {
    expect(
      equivalentsFor(
        catalog({ equivalences: [equivalence(undefined, { status: 'paused' })] }),
        'pricier',
      ),
    ).toEqual([]);
    const paused = catalog();
    paused.products[1] = product('cheaper', '0000000000002', { status: 'retired' });
    expect(equivalentsFor(paused, 'pricier')).toEqual([]);
    const resized = catalog();
    resized.products[1] = product('cheaper', '0000000000002', {
      size: { amount: 5, unit: 'count' },
    });
    expect(equivalentsFor(resized, 'pricier')).toEqual([]);
    const recategorized = catalog();
    recategorized.products[1] = product('cheaper', '0000000000002', { category: 'deodorant' });
    expect(equivalentsFor(recategorized, 'pricier')).toEqual([]);
  });
});

describe('compareOffers', () => {
  it('shows the reviewed equivalent with exact integer savings', () => {
    expect(compareOffers(catalog(), view(), [pricierOffer, cheaperOffer], now)).toMatchObject({
      status: 'show',
      equivalenceId: 'pricier-vs-cheaper',
      product: { id: 'pricier' },
      current: { productId: '0000000000001', price: { amountCents: 679 } },
      alternativeProduct: { id: 'cheaper' },
      alternative: { productId: '0000000000002', price: { amountCents: 599 } },
      savings: { amountCents: 80, currency: 'USD' },
      knownDifferences: ['Handle color differs.'],
      matchedBy: 'retailer-product-id',
    });
  });

  it("stays quiet on the men's product of the pair", () => {
    const cheaperView = view({
      canonicalUrl: 'https://www.kroger.com/p/cheaper/0000000000002',
      productId: '0000000000002',
      currentPriceCents: 599,
    });
    expect(compareOffers(catalog(), cheaperView, [pricierOffer, cheaperOffer], now)).toEqual({
      status: 'no-match',
      reason: 'no-equivalent',
    });
  });

  it('does not compare a product with no reviewed equivalent', () => {
    expect(
      compareOffers(catalog({ equivalences: [] }), view(), [pricierOffer, cheaperOffer], now),
    ).toEqual({ status: 'no-match', reason: 'no-equivalent' });
  });

  it.each([
    ['expired', { expiresAt: '2026-09-18T16:29:59.000Z' }],
    ['out of stock', { availability: 'out-of-stock' }],
    ['different price context', { priceContext: 'store-pickup' }],
    ['different store', { locationId: 'kroger-2002' }],
    ['unreviewed URL', { url: 'https://www.kroger.com/p/cheaper/0000000000009' }],
  ] as const)('ignores an %s equivalent offer', (_label, overrides) => {
    expect(
      compareOffers(
        catalog(),
        view(),
        [pricierOffer, offer('0000000000002', 599, overrides as Partial<Offer>)],
        now,
      ),
    ).toEqual({ status: 'no-match', reason: 'no-eligible-offer' });
  });

  it.each([679, 799])('does not show zero or negative savings (%i)', (amountCents) => {
    expect(
      compareOffers(catalog(), view(), [pricierOffer, offer('0000000000002', amountCents)], now),
    ).toEqual({ status: 'no-match', reason: 'no-positive-savings' });
  });

  it('never uses the page price for savings, and suppresses when it disagrees', () => {
    expect(
      compareOffers(catalog(), view({ currentPriceCents: 629 }), [pricierOffer, cheaperOffer], now),
    ).toEqual({ status: 'suppressed', reason: 'page-price-mismatch' });
  });

  it('suppresses when the current product cannot be priced at the store', () => {
    expect(compareOffers(catalog(), view(), [cheaperOffer], now)).toEqual({
      status: 'suppressed',
      reason: 'current-offer-unavailable',
    });
  });

  it('suppresses invalid page state', () => {
    const offers = [pricierOffer, cheaperOffer];
    expect(compareOffers(catalog(), view({ currentPriceCents: 0 }), offers, now)).toEqual({
      status: 'suppressed',
      reason: 'invalid-current-price',
    });
    expect(compareOffers(catalog(), view({ currency: 'CAD' }), offers, now)).toEqual({
      status: 'suppressed',
      reason: 'invalid-currency',
    });
    expect(compareOffers(catalog(), view({ availability: 'unknown' }), offers, now)).toEqual({
      status: 'suppressed',
      reason: 'current-unavailable',
    });
    expect(compareOffers(catalog(), view({ locationId: undefined }), offers, now)).toEqual({
      status: 'suppressed',
      reason: 'missing-location',
    });
    expect(compareOffers(catalog(), view({ priceContext: 'online' }), offers, now)).toEqual({
      status: 'suppressed',
      reason: 'unsupported-price-context',
    });
    expect(compareOffers(catalog(), view({ selectedVariant: 'Five blades' }), offers, now)).toEqual(
      { status: 'suppressed', reason: 'variant-conflict' },
    );
  });

  it('never matches an unknown product by title', () => {
    expect(
      compareOffers(
        catalog(),
        view({
          productId: '0000000000099',
          canonicalUrl: 'https://www.kroger.com/p/x/0000000000099',
        }),
        [pricierOffer, cheaperOffer],
        now,
      ),
    ).toEqual({ status: 'no-match', reason: 'unknown-product' });
  });
});

describe('listComparisons', () => {
  const store = { locationId: STORE, priceContext: 'in-store' } as const;

  it("lists each pair once, with the women's product as current", () => {
    const [comparison, ...rest] = listComparisons(
      catalog(),
      [cheaperOffer, pricierOffer],
      store,
      now,
    );
    expect(rest).toEqual([]);
    expect(comparison).toMatchObject({
      product: { id: 'pricier' },
      alternativeProduct: { id: 'cheaper' },
      savings: { amountCents: 80 },
    });
    expect(comparison).not.toHaveProperty('matchedBy');
  });

  it("omits pairs where the women's product is not pricier, or a side is missing", () => {
    expect(
      listComparisons(catalog(), [pricierOffer, offer('0000000000002', 679)], store, now),
    ).toEqual([]);
    expect(
      listComparisons(catalog(), [offer('0000000000001', 499), cheaperOffer], store, now),
    ).toEqual([]);
    expect(listComparisons(catalog(), [pricierOffer], store, now)).toEqual([]);
  });

  it('omits paused pairs and online contexts', () => {
    const paused = catalog({ equivalences: [equivalence(undefined, { status: 'paused' })] });
    expect(listComparisons(paused, [pricierOffer, cheaperOffer], store, now)).toEqual([]);
    expect(
      listComparisons(
        catalog(),
        [pricierOffer, cheaperOffer],
        { ...store, priceContext: 'online' },
        now,
      ),
    ).toEqual([]);
  });
});
