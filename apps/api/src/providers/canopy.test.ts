import { describe, expect, it } from 'vitest';
import { CanopyProvider } from './canopy.js';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const product = {
  asin: 'B08N5WRWNW',
  title: 'Reviewed sample razor',
  brand: 'Sample Brand',
  price: { displayString: '$8.99' },
  availability: { status: 'IN_STOCK' },
  link: 'https://www.amazon.com/dp/B08N5WRWNW',
};

describe('CanopyProvider', () => {
  it('uses the reviewed ASIN, normalizes a display price without float arithmetic, and returns online offers only', async () => {
    const requests: string[] = [];
    const provider = new CanopyProvider({
      apiKey: 'fixture-key',
      now: () => new Date('2026-09-18T16:00:00.000Z'),
      fetch: async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        requests.push(url);
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer fixture-key');
        return jsonResponse(product);
      },
    });

    await expect(
      provider.lookupOffers({
        productId: 'B08N5WRWNW',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        priceContext: 'online',
      }),
    ).resolves.toEqual([
      {
        retailer: 'amazon',
        productId: 'B08N5WRWNW',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        price: { amountCents: 899, currency: 'USD' },
        priceContext: 'online',
        condition: 'new',
        availability: 'in-stock',
        observedAt: '2026-09-18T16:00:00.000Z',
        expiresAt: '2026-09-18T16:05:00.000Z',
      },
    ]);
    expect(requests[0]).toBe('https://rest.canopyapi.co/v1/amazon/product?asin=B08N5WRWNW');
  });

  it('fails closed for a malformed price, unavailable product, or non-reviewed URL', async () => {
    const unavailable = new CanopyProvider({
      apiKey: 'fixture-key',
      fetch: async () =>
        jsonResponse({
          ...product,
          price: { displayString: '$8.9' },
          availability: { status: 'OUT_OF_STOCK' },
        }),
    });
    await expect(
      unavailable.lookupOffers({
        productId: 'B08N5WRWNW',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        priceContext: 'online',
      }),
    ).rejects.toMatchObject({ code: 'invalid-response' });
    await expect(
      unavailable.lookupOffers({
        productId: 'B08N5WRWNW',
        url: 'https://example.com/dp/B08N5WRWNW',
        priceContext: 'online',
      }),
    ).rejects.toMatchObject({ code: 'invalid-request' });
  });
});
