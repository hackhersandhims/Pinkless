import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Product, ProductEquivalence } from './schema.js';
import { validateCatalog, validateEquivalences } from './validate.js';

function validProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'sample-razor',
    upc: '012345678905',
    name: 'Sample Razor',
    brand: 'Sample Brand',
    variant: 'One handle',
    category: 'razors',
    audience: 'women',
    size: { amount: 1, unit: 'count' },
    marketedTo: 'women',
    identities: [
      {
        retailer: 'kroger',
        productId: '00012345678905',
        canonicalUrl: 'https://www.kroger.com/p/sample-razor/00012345678905',
        canonicalUrlPatterns: ['^https://www\\.kroger\\.com/p/sample-razor/00012345678905$'],
      },
    ],
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

  it('requires a canonical identity on active products', () => {
    const product = validProduct({ identities: [] });
    expect(messages([product])).toContain('active products need a canonical Kroger identity.');
  });

  it('rejects the intentionally invalid catalog fixture', async () => {
    const fixtureUrl = new URL('../../../fixtures/catalog/invalid-product.json', import.meta.url);
    const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8')) as unknown;
    expect(validateCatalog(fixture)).toMatchObject({ valid: false });
  });
});

function secondProduct(overrides: Partial<Product> = {}): Product {
  return validProduct({
    id: 'other-razor',
    upc: undefined,
    marketedTo: 'men',
    identities: [
      {
        retailer: 'kroger',
        productId: '0007033071397',
        canonicalUrl: 'https://www.kroger.com/p/other-razor/0007033071397',
        canonicalUrlPatterns: ['^https://www\\.kroger\\.com/p/[a-z0-9-]+/0007033071397$'],
      },
    ],
    ...overrides,
  });
}

function pair(overrides: Partial<ProductEquivalence> = {}): ProductEquivalence {
  return {
    id: 'sample-vs-other',
    productIds: ['sample-razor', 'other-razor'],
    rationale: 'Both are single-handle razors.',
    matchedAttributes: ['handle count'],
    knownDifferences: ['Handle color differs.'],
    reviewedBy: 'reviewer',
    reviewedAt: '2026-09-18',
    status: 'active',
    ...overrides,
  };
}

function pairMessages(
  equivalences: unknown,
  products: Product[] = [validProduct(), secondProduct()],
) {
  return validateEquivalences(equivalences, products).issues.map((issue) => issue.message);
}

describe('validateEquivalences', () => {
  it('accepts a reviewed pair of two different, same-size products', () => {
    expect(validateEquivalences([pair()], [validProduct(), secondProduct()])).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('rejects self-pairs, unknown products, and repeated pairs in either order', () => {
    expect(pairMessages([pair({ productIds: ['sample-razor', 'sample-razor'] })])).toContain(
      'must pair two different products.',
    );
    expect(pairMessages([pair({ productIds: ['sample-razor', 'missing'] })])).toContain(
      'references unknown product "missing".',
    );
    expect(
      pairMessages([pair(), pair({ id: 'reversed', productIds: ['other-razor', 'sample-razor'] })]),
    ).toContain('duplicates an existing pair.');
  });

  it("requires exactly one women's product in each pair", () => {
    const message = "must pair exactly one women's product with a men's or neutral product.";
    expect(
      pairMessages([pair()], [validProduct(), secondProduct({ marketedTo: 'women' })]),
    ).toContain(message);
    expect(
      pairMessages([pair()], [validProduct({ marketedTo: 'neutral' }), secondProduct()]),
    ).toContain(message);
    expect(messages([validProduct({ marketedTo: 'girls' as never })])).toContain(
      'must be women, men, or neutral.',
    );
  });

  it('rejects pairs across sizes, categories, or with an inactive product', () => {
    expect(
      pairMessages(
        [pair()],
        [validProduct(), secondProduct({ size: { amount: 2, unit: 'count' } })],
      ),
    ).toContain('must pair products with the same size unit and amount.');
    expect(
      pairMessages([pair()], [validProduct(), secondProduct({ category: 'deodorant' })]),
    ).toContain('must pair products in the same category.');
    expect(pairMessages([pair()], [validProduct(), secondProduct({ status: 'paused' })])).toContain(
      'an active equivalence needs two active products.',
    );
  });

  it('requires a rationale, known differences, and a dated review', () => {
    const result = pairMessages([
      pair({ rationale: ' ', knownDifferences: [], reviewedBy: '', reviewedAt: 'yesterday' }),
    ]);
    expect(result).toContain('must be a non-empty string.');
    expect(result).toContain('must be a non-empty array of non-empty strings.');
    expect(result).toContain('must name the reviewer.');
    expect(result).toContain('must be an ISO date (YYYY-MM-DD).');
  });

  it('accepts the shipped catalog', async () => {
    const products = JSON.parse(
      await readFile(new URL('../products.json', import.meta.url), 'utf8'),
    ) as unknown;
    const equivalences = JSON.parse(
      await readFile(new URL('../equivalences.json', import.meta.url), 'utf8'),
    ) as unknown;
    expect(validateCatalog(products).issues).toEqual([]);
    expect(validateEquivalences(equivalences, products).issues).toEqual([]);
  });
});
