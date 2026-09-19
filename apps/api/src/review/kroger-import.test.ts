import { describe, expect, it, vi } from 'vitest';
import type { RetailerProvider } from '../providers/types.js';
import { importKrogerReviewProducts, parseKrogerReviewImportRequest } from './kroger-import.js';

const payload = {
  krogerProducts: [
    {
      productId: '0007033071417',
      canonicalUrl:
        'https://www.kroger.com/p/bic-soleil-smooth-scented-disposable-3-blade-razors/0007033071417',
      variant: '3-blade disposable razor, 4 count',
      category: 'razors',
      size: { amount: 4, unit: 'count' },
      marketedTo: 'women',
    },
    {
      productId: '0007033071397',
      canonicalUrl:
        'https://www.kroger.com/p/bic-comfort-3-advance-disposable-razors/0007033071397',
      variant: '3-blade disposable razor, 4 count',
      category: 'razors',
      size: { amount: 4, unit: 'count' },
      marketedTo: 'men',
    },
  ],
};

function provider(): RetailerProvider {
  return {
    retailer: 'kroger',
    status: { available: true, mode: 'live' },
    lookupProduct: vi.fn(async ({ productId }) => ({
      retailer: 'kroger' as const,
      productId: productId!,
      upc: productId === '0007033071417' ? '070330714175' : '070330713970',
      name: productId === '0007033071417' ? 'Official Women Razor' : 'Official Men Razor',
      brand: 'BIC',
      size: '4 ct',
    })),
    lookupLocations: vi.fn(async () => []),
    lookupOffers: vi.fn(async () => []),
  };
}

describe('Kroger review import input', () => {
  it('accepts exact Kroger identities plus reviewer classifications', () => {
    expect(parseKrogerReviewImportRequest(payload)).toMatchObject({ maxCandidates: 12 });
  });

  it('rejects mismatched URLs, duplicate IDs, or a one-sided product set', () => {
    const [women, men] = payload.krogerProducts;
    expect(
      parseKrogerReviewImportRequest({
        krogerProducts: [{ ...women, canonicalUrl: men.canonicalUrl }, men],
      }),
    ).toBeNull();
    expect(parseKrogerReviewImportRequest({ krogerProducts: [women, women] })).toBeNull();
    expect(
      parseKrogerReviewImportRequest({
        krogerProducts: [women, { ...men, marketedTo: 'women' }],
      }),
    ).toBeNull();
  });
});

describe('Kroger review metadata import', () => {
  it('uses official provider metadata while preserving reviewer classifications', async () => {
    const request = parseKrogerReviewImportRequest(payload)!;
    await expect(importKrogerReviewProducts(request, provider())).resolves.toEqual({
      maxCandidates: 12,
      products: [
        expect.objectContaining({
          name: 'Official Women Razor',
          brand: 'BIC',
          upc: '070330714175',
          sourceSize: '4 ct',
          marketedTo: 'women',
        }),
        expect.objectContaining({
          name: 'Official Men Razor',
          upc: '070330713970',
          marketedTo: 'men',
        }),
      ],
    });
  });

  it('fails the whole import when Kroger cannot verify one product', async () => {
    const request = parseKrogerReviewImportRequest(payload)!;
    const unavailable = provider();
    unavailable.lookupProduct = vi.fn(async () => null);
    await expect(importKrogerReviewProducts(request, unavailable)).resolves.toBeNull();
  });
});
