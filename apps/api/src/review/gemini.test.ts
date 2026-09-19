import { describe, expect, it, vi } from 'vitest';
import { draftGeminiCandidates } from './gemini.js';

const request = {
  products: [
    {
      name: 'Women Razor',
      category: 'razors' as const,
      size: { amount: 4, unit: 'count' as const },
      marketedTo: 'women' as const,
    },
    {
      name: 'Men Razor',
      category: 'razors' as const,
      size: { amount: 4, unit: 'count' as const },
      marketedTo: 'men' as const,
    },
  ],
  maxCandidates: 12,
};

describe('draftGeminiCandidates', () => {
  it('uses Gemini structured JSON and marks every accepted result for human review', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      candidates: [
                        {
                          womenProductIndex: 0,
                          alternativeProductIndex: 1,
                          rationale: 'Same four-count razor format.',
                          matchedAttributes: ['pack count'],
                          knownDifferences: ['handle color'],
                          confidence: 'medium',
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(draftGeminiCandidates(request, { GEMINI_API_KEY: 'secret' }, fetcher)).resolves
      .toEqual([expect.objectContaining({ requiresHumanReview: true })]);
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('gemini-2.5-flash:generateContent');
    expect(init.headers).toMatchObject({ 'x-goog-api-key': 'secret' });
    expect(JSON.parse(String(init.body))).toMatchObject({
      generationConfig: { responseMimeType: 'application/json' },
    });
  });

  it('fails closed when no key is configured or Gemini is unavailable', async () => {
    expect(await draftGeminiCandidates(request, {})).toBeNull();
    await expect(
      draftGeminiCandidates(request, { GEMINI_API_KEY: 'secret' }, vi.fn().mockRejectedValue('offline')),
    ).resolves.toBeNull();
  });
});
