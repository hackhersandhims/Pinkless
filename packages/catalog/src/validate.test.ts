import { describe, expect, it } from 'vitest';
import type { Comparison } from './schema.js';
import { validateCatalog } from './validate.js';

function validComparison(): Comparison {
  return {
    id: 'sample-razor',
    category: 'razors',
    target: {
      retailer: 'Target',
      productId: '12345678',
      canonicalUrlPatterns: ['^https://www\\.target\\.com/p/sample-razor/-/A-12345678(?:\\?.*)?$'],
      name: 'Sample Razor',
      brand: 'Sample Brand',
      variant: 'Starter Set',
      marketedAs: 'women',
      price: { amountCents: 1299, currency: 'USD' },
      size: { amount: 1, unit: 'count' },
    },
    alternative: {
      retailer: 'Example Retailer',
      url: 'https://example.com/sample-razor',
      name: 'Comparable Sample Razor',
      price: { amountCents: 999, currency: 'USD' },
      size: { amount: 1, unit: 'count' },
      condition: 'new',
      availability: 'verified-in-stock',
    },
    equivalence: {
      rationale: 'Both products are reviewed single-handle starter razors.',
      matchedAttributes: ['single handle', 'starter razor'],
    },
    evidence: {
      verifiedAt: '2026-09-18',
      sourceUrls: ['https://www.target.com/p/sample-razor/-/A-12345678'],
    },
    status: 'active',
  };
}

function validationMessages(value: unknown): string[] {
  return validateCatalog(value).issues.map((issue) => issue.message);
}

describe('validateCatalog', () => {
  it('accepts a reviewed comparison with compatible sizes and positive savings', () => {
    expect(validateCatalog([validComparison()])).toEqual({ valid: true, issues: [] });
  });

  it('rejects duplicate IDs', () => {
    expect(validationMessages([validComparison(), validComparison()])).toContain(
      'duplicates comparison ID "sample-razor".',
    );
  });

  it('rejects invalid money', () => {
    const comparison = validComparison();
    comparison.alternative.price.amountCents = 999.5;

    expect(validationMessages([comparison])).toContain(
      'must be a positive integer number of cents.',
    );
  });

  it('rejects records with missing evidence', () => {
    const comparison = validComparison() as unknown as { evidence?: unknown };
    delete comparison.evidence;

    expect(validationMessages([comparison])).toContain('must be an object.');
  });

  it('rejects incompatible size units', () => {
    const comparison = validComparison();
    comparison.alternative.size = { amount: 100, unit: 'ml' };

    expect(validationMessages([comparison])).toContain('must match target size unit (count).');
  });

  it('rejects malformed canonical URL patterns', () => {
    const comparison = validComparison();
    comparison.target.canonicalUrlPatterns = ['^['];

    expect(validationMessages([comparison])).toContain('must be a valid regular expression.');
  });

  it('rejects alternatives that are not verified in stock and new', () => {
    const comparison = validComparison() as unknown as {
      alternative: { availability: string; condition: string };
    };
    comparison.alternative.availability = 'out-of-stock';
    comparison.alternative.condition = 'used';

    const messages = validationMessages([comparison]);
    expect(messages).toContain('must be verified-in-stock.');
    expect(messages).toContain('must be new.');
  });

  it('rejects active records whose alternative is not cheaper', () => {
    const comparison = validComparison();
    comparison.alternative.price.amountCents = comparison.target.price.amountCents;

    expect(validationMessages([comparison])).toContain(
      'must be lower than the recorded target price for an active record.',
    );
  });
});
