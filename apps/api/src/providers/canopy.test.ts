import { describe, expect, it } from 'vitest';
import { CanopyProvider } from './canopy.js';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const product = {
  data: {
    amazonProduct: {
      asin: 'B08N5WRWNW',
      title: 'Reviewed sample razor',
      brand: 'Sample Brand',
      price: { currency: 'USD', display: '$8.99' },
      isInStock: true,
      isNew: true,
      seller: { name: 'Amazon.com' },
      coupon: null,
      url: 'https://www.amazon.com/dp/B08N5WRWNW',
    },
  },
};

describe('CanopyProvider', () => {
  it('uses the current REST response envelope, normalizes a display price without float arithmetic, and returns online offers only', async () => {
    const requests: string[] = [];
    const provider = new CanopyProvider({
      apiKey: 'fixture-key',
      now: () => new Date('2026-09-18T16:00:00.000Z'),
      fetch: async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        requests.push(url);
        expect(init?.method).toBe('GET');
        expect(new Headers(init?.headers).get('API-KEY')).toBe('fixture-key');
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
    expect(requests[0]).toBe(
      'https://rest.canopyapi.co/api/amazon/product?asin=B08N5WRWNW&domain=US',
    );
  });

  it('fails closed for a malformed price, unavailable, third-party, coupon, or non-reviewed product', async () => {
    const malformedPrice = new CanopyProvider({
      apiKey: 'fixture-key',
      fetch: async () =>
        jsonResponse({
          ...product,
          data: {
            amazonProduct: {
              ...product.data.amazonProduct,
              price: { currency: 'USD', display: '$8.9' },
            },
          },
        }),
    });
    await expect(
      malformedPrice.lookupOffers({
        productId: 'B08N5WRWNW',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        priceContext: 'online',
      }),
    ).rejects.toMatchObject({ code: 'invalid-response' });
    const unavailable = new CanopyProvider({
      apiKey: 'fixture-key',
      fetch: async () =>
        jsonResponse({
          data: {
            amazonProduct: { ...product.data.amazonProduct, isInStock: false },
          },
        }),
    });
    await expect(
      unavailable.lookupOffers({
        productId: 'B08N5WRWNW',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        priceContext: 'online',
      }),
    ).resolves.toEqual([]);
    const thirdParty = new CanopyProvider({
      apiKey: 'fixture-key',
      fetch: async () =>
        jsonResponse({
          data: {
            amazonProduct: {
              ...product.data.amazonProduct,
              seller: { name: 'Marketplace Seller' },
            },
          },
        }),
    });
    await expect(
      thirdParty.lookupOffers({
        productId: 'B08N5WRWNW',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        priceContext: 'online',
      }),
    ).resolves.toEqual([]);
    const coupon = new CanopyProvider({
      apiKey: 'fixture-key',
      fetch: async () =>
        jsonResponse({
          data: {
            amazonProduct: { ...product.data.amazonProduct, coupon: { value: '$1 off' } },
          },
        }),
    });
    await expect(
      coupon.lookupOffers({
        productId: 'B08N5WRWNW',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        priceContext: 'online',
      }),
    ).resolves.toEqual([]);
    await expect(
      unavailable.lookupOffers({
        productId: 'B08N5WRWNW',
        url: 'https://example.com/dp/B08N5WRWNW',
        priceContext: 'online',
      }),
    ).rejects.toMatchObject({ code: 'invalid-request' });
  });
});
