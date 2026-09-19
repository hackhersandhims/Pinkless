import { describe, expect, it, vi } from 'vitest';
import { createReviewCandidatesHandler } from './review-candidates.js';

const payload = {
  products: [
    {
      name: 'Women Razor',
      category: 'razors',
      size: { amount: 4, unit: 'count' },
      marketedTo: 'women',
    },
    {
      name: 'Men Razor',
      category: 'razors',
      size: { amount: 4, unit: 'count' },
      marketedTo: 'men',
    },
  ],
};

function request(body: unknown, token = 'review-token'): Request {
  return new Request('https://pinkless.test/api/review/candidates', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('private review candidate route', () => {
  it('requires the reviewer token before calling Gemini', async () => {
    const draft = vi.fn();
    const response = await createReviewCandidatesHandler(
      { PINKLESS_REVIEW_API_TOKEN: 'review-token' },
      draft,
    )(request(payload, 'wrong-token'));
    expect(response.status).toBe(401);
    expect(draft).not.toHaveBeenCalled();
  });

  it('returns draft-only candidates and never a catalog write capability', async () => {
    const draft = vi.fn().mockResolvedValue([
      {
        womenProductIndex: 0,
        alternativeProductIndex: 1,
        rationale: 'Same format.',
        matchedAttributes: ['pack count'],
        knownDifferences: ['handle color'],
        confidence: 'medium',
        requiresHumanReview: true,
      },
    ]);
    const response = await createReviewCandidatesHandler(
      { PINKLESS_REVIEW_API_TOKEN: 'review-token' },
      draft,
    )(request(payload));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      source: 'reviewer-supplied',
      products: payload.products,
      reviewRequired: true,
      catalogWriteAllowed: false,
    });
  });

  it('imports official Kroger metadata before asking Gemini to draft candidates', async () => {
    const imported = {
      products: [
        { ...payload.products[0], name: 'Official Women Razor', productId: '0007033071417' },
        { ...payload.products[1], name: 'Official Men Razor', productId: '0007033071397' },
      ],
      maxCandidates: 12,
    };
    const importer = vi.fn().mockResolvedValue(imported);
    const draft = vi.fn().mockResolvedValue([]);
    const response = await createReviewCandidatesHandler(
      { PINKLESS_REVIEW_API_TOKEN: 'review-token' },
      draft,
      importer,
    )(
      request({
        krogerProducts: [
          {
            productId: '0007033071417',
            canonicalUrl: 'https://www.kroger.com/p/women-razor/0007033071417',
            variant: '4 count',
            category: 'razors',
            size: { amount: 4, unit: 'count' },
            marketedTo: 'women',
          },
          {
            productId: '0007033071397',
            canonicalUrl: 'https://www.kroger.com/p/men-razor/0007033071397',
            variant: '4 count',
            category: 'razors',
            size: { amount: 4, unit: 'count' },
            marketedTo: 'men',
          },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(importer).toHaveBeenCalledOnce();
    expect(draft).toHaveBeenCalledWith(imported, expect.any(Object));
    await expect(response.json()).resolves.toMatchObject({
      source: 'kroger-official-api',
      products: imported.products,
      reviewRequired: true,
      catalogWriteAllowed: false,
    });
  });

  it('wires the default importer to the configured Kroger provider', async () => {
    const draft = vi.fn().mockResolvedValue([]);
    const response = await createReviewCandidatesHandler(
      {
        PINKLESS_REVIEW_API_TOKEN: 'review-token',
        PINKLESS_PROVIDER_MODE: 'mock',
      },
      draft,
    )(
      request({
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
      }),
    );

    expect(response.status).toBe(200);
    expect(draft).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [
          expect.objectContaining({
            name: 'BIC Soleil Smooth Scented Disposable 3-Blade Razors',
            productId: '0007033071417',
            sourceSize: '4 count',
          }),
          expect.objectContaining({
            name: 'BIC Comfort 3 Advance Disposable Razors',
            productId: '0007033071397',
            sourceSize: '4 count',
          }),
        ],
      }),
      expect.any(Object),
    );
  });

  it('fails closed before Gemini when Kroger cannot verify an imported product', async () => {
    const importer = vi.fn().mockResolvedValue(null);
    const draft = vi.fn();
    const response = await createReviewCandidatesHandler(
      { PINKLESS_REVIEW_API_TOKEN: 'review-token' },
      draft,
      importer,
    )(
      request({
        krogerProducts: [
          {
            productId: '0007033071417',
            canonicalUrl: 'https://www.kroger.com/p/women-razor/0007033071417',
            variant: '4 count',
            category: 'razors',
            size: { amount: 4, unit: 'count' },
            marketedTo: 'women',
          },
          {
            productId: '0007033071397',
            canonicalUrl: 'https://www.kroger.com/p/men-razor/0007033071397',
            variant: '4 count',
            category: 'razors',
            size: { amount: 4, unit: 'count' },
            marketedTo: 'men',
          },
        ],
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'kroger-import-unavailable' });
    expect(draft).not.toHaveBeenCalled();
  });

  it('fails closed when Gemini cannot produce candidates', async () => {
    const response = await createReviewCandidatesHandler(
      { PINKLESS_REVIEW_API_TOKEN: 'review-token' },
      vi.fn().mockResolvedValue(null),
    )(request(payload));
    expect(response.status).toBe(503);
  });
});
