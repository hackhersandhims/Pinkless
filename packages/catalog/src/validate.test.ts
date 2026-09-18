import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Product } from './schema.js';
import { validateCatalog } from './validate.js';

function validProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'sample-razor',
    upc: '012345678905',
    name: 'Sample Razor',
    brand: 'Sample Brand',
    variant: 'One handle',
    category: 'razors',
    size: { amount: 1, unit: 'count' },
    identities: [
      {
        retailer: 'kroger',
        productId: '00012345678905',
        canonicalUrl: 'https://www.kroger.com/p/sample-razor/00012345678905',
        canonicalUrlPatterns: ['^https://www\\.kroger\\.com/p/sample-razor/00012345678905$'],
      },
    ],
    equivalence: {
      policy: 'exact-packaged-product',
      rationale: 'Every identity refers to the same packaged one-handle razor.',
      matchedAttributes: ['UPC', 'one handle'],
    },
    status: 'active',
    ...overrides,
  };
}

function messages(value: unknown): string[] {
  return validateCatalog(value).issues.map((issue) => issue.message);
}

describe('validateCatalog', () => {
  it('accepts a retailer-neutral exact product record', () => {
    expect(validateCatalog([validProduct()])).toEqual({ valid: true, issues: [] });
  });

  it('rejects duplicate product IDs, UPCs, and retailer product identities', () => {
    const duplicate = validProduct({ id: 'second-product' });
    const result = messages([validProduct(), duplicate]);
    expect(result).toContain('duplicates UPC/GTIN "012345678905".');
    expect(result).toContain('duplicates retailer product identity "kroger:00012345678905".');
    expect(messages([validProduct(), validProduct()])).toContain(
      'duplicates product ID "sample-razor".',
    );
  });

  it('rejects invalid GTIN check digits and sizes', () => {
    const product = validProduct({ upc: '012345678904', size: { amount: 0, unit: 'count' } });
    const result = messages([product]);
    expect(result).toContain('must be a valid GTIN-8, UPC-A, EAN-13, or GTIN-14.');
    expect(result).toContain('must be a positive finite number.');
  });

  it('rejects duplicate retailer identities on one product', () => {
    const product = validProduct();
    product.identities.push({ ...product.identities[0]! });
    expect(messages([product])).toContain(
      'duplicates retailer identity "kroger" for this product.',
    );
  });

  it('rejects malformed or unanchored canonical URL patterns', () => {
    const product = validProduct();
    product.identities[0]!.canonicalUrlPatterns = ['^['];
    expect(messages([product])).toContain(
      'must be an anchored HTTPS regular expression of at most 512 characters.',
    );

    product.identities[0]!.canonicalUrlPatterns = ['^https://[invalid$'];
    expect(messages([product])).toContain('must be a valid regular expression.');

    product.identities[0]!.canonicalUrlPatterns = ['^https://www\\.walmart\\.com/item$'];
    expect(messages([product])).toContain('must target the canonical kroger.com domain.');
  });

  it('requires a reviewed outbound URL on the retailer domain that matches its pattern', () => {
    const product = validProduct();
    product.identities[0]!.canonicalUrl = 'https://example.com/sample-razor';
    expect(messages([product])).toContain('must target the canonical kroger.com domain.');

    product.identities[0]!.canonicalUrl = 'https://www.kroger.com/p/another-product';
    expect(messages([product])).toContain(
      'must match at least one canonical URL pattern for this identity.',
    );
  });

  it('rejects an unsupported equivalence policy', () => {
    const product = validProduct() as unknown as { equivalence: { policy: string } };
    product.equivalence.policy = 'similar-title';
    expect(messages([product])).toContain('must use the supported exact-packaged-product policy.');
  });

  it('requires a canonical identity on active products', () => {
    const product = validProduct({ upc: undefined, identities: [] });
    expect(messages([product])).toContain(
      'active products need a UPC/GTIN or at least one canonical retailer identity.',
    );
  });

  it('rejects the intentionally invalid catalog fixture', async () => {
    const fixtureUrl = new URL('../../../fixtures/catalog/invalid-product.json', import.meta.url);
    const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8')) as unknown;
    expect(validateCatalog(fixture)).toMatchObject({ valid: false });
  });
});
