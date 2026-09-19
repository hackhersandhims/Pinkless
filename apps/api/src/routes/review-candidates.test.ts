import { describe, expect, it, vi } from 'vitest';
import { createReviewCandidatesHandler } from './review-candidates.js';

const payload = {
  products: [
    { name: 'Women Razor', category: 'razors', size: { amount: 4, unit: 'count' }, marketedTo: 'women' },
    { name: 'Men Razor', category: 'razors', size: { amount: 4, unit: 'count' }, marketedTo: 'men' },
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
    const response = await createReviewCandidatesHandler({ PINKLESS_REVIEW_API_TOKEN: 'review-token' }, draft)(
      request(payload, 'wrong-token'),
    );
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
    const response = await createReviewCandidatesHandler({ PINKLESS_REVIEW_API_TOKEN: 'review-token' }, draft)(
      request(payload),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reviewRequired: true,
      catalogWriteAllowed: false,
    });
  });

  it('fails closed when Gemini cannot produce candidates', async () => {
    const response = await createReviewCandidatesHandler(
      { PINKLESS_REVIEW_API_TOKEN: 'review-token' },
      vi.fn().mockResolvedValue(null),
    )(request(payload));
    expect(response.status).toBe(503);
  });
});
