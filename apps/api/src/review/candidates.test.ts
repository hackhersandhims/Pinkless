import { describe, expect, it } from 'vitest';
import { parseReviewCandidateRequest, validateReviewCandidates } from './candidates.js';

const products = [
  {
    name: 'Women Razor',
    category: 'razors',
    size: { amount: 4, unit: 'count' },
    marketedTo: 'women',
  },
  {
    name: 'Neutral Razor',
    category: 'razors',
    size: { amount: 4, unit: 'count' },
    marketedTo: 'neutral',
  },
] as const;

describe('private review candidate input', () => {
  it('accepts bounded Kroger product metadata without a price', () => {
    expect(parseReviewCandidateRequest({ products })).toEqual({ products, maxCandidates: 12 });
  });

  it('rejects unbounded or malformed reviewer input', () => {
    expect(parseReviewCandidateRequest({ products: [products[0]] })).toBeNull();
    expect(parseReviewCandidateRequest({ products, maxCandidates: 26 })).toBeNull();
    expect(
      parseReviewCandidateRequest({
        products: [{ ...products[0], canonicalUrl: 'https://example.com/not-kroger' }, products[1]],
      }),
    ).toBeNull();
    expect(
      parseReviewCandidateRequest({
        products: [{ ...products[0], productId: 'not-a-kroger-id' }, products[1]],
      }),
    ).toBeNull();
  });
});

describe('Gemini candidate validation', () => {
  it('retains only structurally compatible human-review candidates', () => {
    const candidates = validateReviewCandidates(
      {
        candidates: [
          {
            womenProductIndex: 0,
            alternativeProductIndex: 1,
            rationale: 'Same four-count razor format.',
            matchedAttributes: ['pack count'],
            knownDifferences: ['handle color'],
            confidence: 'medium',
          },
          {
            womenProductIndex: 1,
            alternativeProductIndex: 0,
            rationale: 'Wrong direction.',
            matchedAttributes: ['pack count'],
            knownDifferences: ['handle color'],
            confidence: 'high',
          },
        ],
      },
      [...products],
      12,
    );
    expect(candidates).toEqual([
      expect.objectContaining({
        womenProductIndex: 0,
        alternativeProductIndex: 1,
        requiresHumanReview: true,
      }),
    ]);
  });

  it('drops a category or size mismatch even if Gemini proposes it', () => {
    const mismatched = [products[0], { ...products[1], category: 'deodorant' as const }];
    expect(
      validateReviewCandidates(
        {
          candidates: [
            {
              womenProductIndex: 0,
              alternativeProductIndex: 1,
              rationale: 'Invalid.',
              matchedAttributes: ['pack count'],
              knownDifferences: ['scent'],
              confidence: 'high',
            },
          ],
        },
        mismatched,
        12,
      ),
    ).toEqual([]);
  });
});
