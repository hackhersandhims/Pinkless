import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { KrogerProvider } from './kroger.js';

async function jsonFixture(name: string): Promise<unknown> {
  const url = new URL(`../../../../fixtures/providers/${name}`, import.meta.url);
  return JSON.parse(await readFile(url, 'utf8')) as unknown;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('KrogerProvider', () => {
  it('uses documented auth, location, and product endpoints and normalizes regular price', async () => {
    const productFixture = await jsonFixture('kroger-api-product.json');
    const locationsFixture = await jsonFixture('kroger-api-locations.json');
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      const headers = new Headers(init?.headers);
      requests.push({ url, authorization: headers.get('authorization') });
      if (url.endsWith('/connect/oauth2/token')) {
        expect(init?.method).toBe('POST');
        expect(String(init?.body)).toContain('scope=product.compact');
        return jsonResponse({ access_token: 'fixture-token', expires_in: 1800 });
      }
      if (new URL(url).pathname.endsWith('/locations')) return jsonResponse(locationsFixture);
      return jsonResponse(productFixture);
    };
    const provider = new KrogerProvider({
      clientId: 'fixture-client',
      clientSecret: 'fixture-secret',
      fetch: fetchImpl,
      now: () => new Date('2026-09-18T16:00:00.000Z'),
    });

    await expect(provider.lookupLocations({ postalCode: '45202' })).resolves.toEqual([
      {
        retailer: 'kroger',
        locationId: 'kroger-1001',
        name: 'Kroger Downtown',
        address: {
          line1: '1 Demo Way',
          city: 'Cincinnati',
          state: 'OH',
          postalCode: '45202',
        },
      },
    ]);
    const offers = await provider.lookupOffers({
      upc: '012345678905',
      locationId: 'kroger-1001',
      priceContext: 'store-pickup',
      url: 'https://www.kroger.com/p/sample-razor/00012345678905',
    });

    expect(offers).toEqual([
      {
        retailer: 'kroger',
        productId: '00012345678905',
        url: 'https://www.kroger.com/p/sample-razor/00012345678905',
        price: { amountCents: 999, currency: 'USD' },
        priceContext: 'store-pickup',
        condition: 'new',
        availability: 'in-stock',
        locationId: 'kroger-1001',
        observedAt: '2026-09-18T16:00:00.000Z',
        expiresAt: '2026-09-18T16:15:00.000Z',
      },
    ]);
    expect(requests.filter(({ url }) => url.endsWith('/connect/oauth2/token'))).toHaveLength(1);
    expect(requests[1]!.url).toContain('/v1/locations?');
    expect(requests[2]!.url).toContain('/v1/products/012345678905?filter.locationId=kroger-1001');
    expect(requests[2]!.authorization).toBe('Bearer fixture-token');
  });

  it('suppresses online prices and requests without a location', async () => {
    const unreachableFetch: typeof fetch = async () => {
      throw new Error('fetch should not run');
    };
    const provider = new KrogerProvider({
      clientId: 'fixture-client',
      clientSecret: 'fixture-secret',
      fetch: unreachableFetch,
    });
    const base = {
      upc: '012345678905',
      url: 'https://www.kroger.com/p/sample-razor/00012345678905',
    } as const;
    await expect(provider.lookupOffers({ ...base, priceContext: 'online' })).resolves.toEqual([]);
    await expect(provider.lookupOffers({ ...base, priceContext: 'store-pickup' })).resolves.toEqual(
      [],
    );
  });

  it('rejects missing credentials and non-Kroger outbound URLs', async () => {
    expect(() => new KrogerProvider({ clientId: '', clientSecret: '' })).toThrow(
      'Kroger credentials are missing.',
    );
    const provider = new KrogerProvider({
      clientId: 'fixture-client',
      clientSecret: 'fixture-secret',
    });
    await expect(
      provider.lookupOffers({
        upc: '012345678905',
        locationId: 'kroger-1001',
        priceContext: 'store-pickup',
        url: 'https://example.com/not-reviewed',
      }),
    ).rejects.toMatchObject({ code: 'invalid-request' });
  });
});
