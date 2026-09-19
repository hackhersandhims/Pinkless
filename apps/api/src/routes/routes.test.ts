import { describe, expect, it } from 'vitest';
import { catalog } from '../catalog.js';
import { ComparisonService } from '../core/comparison-service.js';
import { ProviderGateway } from '../core/gateway.js';
import { createMockData, MOCK_KROGER_LOCATION_ID } from '../providers/mock-data.js';
import { MockRetailerProvider } from '../providers/mock.js';
import type { ProviderRegistry } from '../providers/registry.js';
import { UnavailableRetailerProvider } from '../providers/unavailable.js';
import { createCompareHandler } from './compare.js';
import { createComparisonsHandler } from './comparisons.js';
import { optionsResponse } from './http.js';
import { createStoresHandler } from './stores.js';

const now = new Date('2026-09-18T16:30:00.000Z');
const allowedOrigin = 'http://localhost:5173';
const environment = { NODE_ENV: 'test', PINKLESS_ALLOWED_ORIGINS: allowedOrigin };

const SOLEIL = catalog.products.find((product) => product.marketedTo === 'women')!;
const COMFORT = catalog.products.find((product) => product.marketedTo === 'men')!;

function mockDataWithAlternative(retailer: Retailer) {
  const data = createMockData(retailer, now);
  const details = alternativeIdentityDetails[retailer];
  const existingOffer = data.offers[0]!;
  return {
    ...data,
    products: [
      ...data.products,
      {
        retailer,
        productId: details.productId,
        upc: '036602301972',
        name: "Men's Sample Razor",
        brand: 'Sample Brand',
        size: '1 count',
      },
    ],
    offers: [
      ...data.offers,
      {
        ...existingOffer,
        productId: details.productId,
        url: details.url,
        price: { amountCents: 899, currency: 'USD' as const },
      },
    ],
  };
}

function mockRegistry(): ProviderRegistry {
  return { kroger: new MockRetailerProvider('kroger', createMockData(now)) };
}

function service(registry = mockRegistry()) {
  return new ComparisonService(
    catalog,
    new ProviderGateway(registry, { now: () => now }),
    () => now,
  );
}

function compareBody(product = SOLEIL, currentPriceCents = 679) {
  const identity = product.identities[0]!;
  return {
    current: {
      retailer: 'kroger',
      canonicalUrl: identity.canonicalUrl,
      productId: identity.productId,
      title: product.name,
      currentPriceCents,
      currency: 'USD',
      priceContext: 'in-store',
      locationId: MOCK_KROGER_LOCATION_ID,
      availability: 'in-stock',
    },
  };
}

function compareHandler(registry = mockRegistry(), nodeEnv = 'test') {
  return createCompareHandler(service(registry), { ...environment, NODE_ENV: nodeEnv });
}

function post(body: unknown, origin = allowedOrigin): Request {
  return new Request('https://pinkless.test/api/compare', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('comparison route', () => {
  it("shows the men's equivalent on the women's product, priced at the same store", async () => {
    const response = await compareHandler()(post(compareBody()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'show',
      product: { id: SOLEIL.id, marketedTo: 'women' },
      current: { price: { amountCents: 679 }, locationId: MOCK_KROGER_LOCATION_ID },
      alternativeProduct: { id: COMFORT.id, marketedTo: 'men' },
      alternative: { price: { amountCents: 599 }, locationId: MOCK_KROGER_LOCATION_ID },
      savings: { amountCents: 80, currency: 'USD' },
    });
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
  });

  it("stays quiet on the men's product", async () => {
    const response = await compareHandler()(post(compareBody(COMFORT, 599)));
    await expect(response.json()).resolves.toEqual({ status: 'no-match', reason: 'no-equivalent' });
  });

  it('suppresses when the page price disagrees with the provider', async () => {
    const response = await compareHandler()(post(compareBody(SOLEIL, 629)));
    await expect(response.json()).resolves.toEqual({
      status: 'suppressed',
      reason: 'page-price-mismatch',
    });
  });

  it('rejects unknown origins and malformed requests', async () => {
    const denied = await compareHandler()(post(compareBody(), 'https://evil.example'));
    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toMatchObject({ reason: 'origin-not-allowed' });

    const invalid = await compareHandler()(post({ current: { retailer: 'cvs' } }));
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({ reason: 'invalid-request' });
  });

  it('omits diagnostic reason codes in production', async () => {
    const response = await compareHandler(
      mockRegistry(),
      'production',
    )(post({ current: { retailer: 'cvs' } }));
    await expect(response.json()).resolves.toEqual({ status: 'suppressed' });
  });

  it('suppresses a comparison when Kroger is unavailable', async () => {
    const registry: ProviderRegistry = {
      kroger: new UnavailableRetailerProvider('kroger', 'fixture'),
    };
    const response = await compareHandler(registry)(post(compareBody()));
    await expect(response.json()).resolves.toEqual({
      status: 'suppressed',
      reason: 'provider-unavailable',
    });
  });
});

describe('comparisons list route', () => {
  function get(query: string, registry = mockRegistry()) {
    const handler = createComparisonsHandler(service(registry), environment, () => now);
    return handler(
      new Request(`https://pinkless.test/api/comparisons${query}`, {
        headers: { origin: allowedOrigin },
      }),
    );
  }

  it('lists every pair with a saving at the store', async () => {
    const response = await get(`?locationId=${MOCK_KROGER_LOCATION_ID}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { comparisons: unknown[] };
    expect(body).toMatchObject({
      status: 'ok',
      store: { locationId: MOCK_KROGER_LOCATION_ID, priceContext: 'in-store' },
      generatedAt: now.toISOString(),
    });
    expect(body.comparisons).toHaveLength(1);
    expect(body.comparisons[0]).toMatchObject({
      product: { id: SOLEIL.id },
      alternativeProduct: { id: COMFORT.id },
      savings: { amountCents: 80 },
    });
  });

  it('returns an empty list at a store with no prices', async () => {
    const response = await get('?locationId=kroger-9999');
    await expect(response.json()).resolves.toMatchObject({ status: 'ok', comparisons: [] });
  });

  it('requires a store and a store price context', async () => {
    expect((await get('')).status).toBe(400);
    expect((await get(`?locationId=${MOCK_KROGER_LOCATION_ID}&priceContext=online`)).status).toBe(
      400,
    );
  });

  it('fails the whole list when Kroger is unavailable', async () => {
    const response = await get(`?locationId=${MOCK_KROGER_LOCATION_ID}`, {
      kroger: new UnavailableRetailerProvider('kroger', 'fixture'),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 'suppressed',
      reason: 'provider-unavailable',
    });
  });
});

describe('stores route', () => {
  function handler() {
    return createStoresHandler(
      new ProviderGateway(mockRegistry(), { now: () => now }),
      environment,
    );
  }

  it('returns normalized Kroger locations, with or without a retailer parameter', async () => {
    for (const query of ['retailer=kroger&postalCode=45202', 'postalCode=45202']) {
      const response = await handler()(
        new Request(`https://pinkless.test/api/stores?${query}`, {
          headers: { origin: allowedOrigin },
        }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: 'ok',
        locations: [{ retailer: 'kroger', locationId: MOCK_KROGER_LOCATION_ID }],
      });
    }
  });

  it('rejects unsupported retailers', async () => {
    const response = await handler()(
      new Request('https://pinkless.test/api/stores?retailer=walmart&postalCode=45202', {
        headers: { origin: allowedOrigin },
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe('CORS preflight', () => {
  it('returns an empty 204 response only to configured origins', async () => {
    const response = optionsResponse(
      new Request('https://pinkless.test/api/compare', {
        method: 'OPTIONS',
        headers: { origin: allowedOrigin },
      }),
      { PINKLESS_ALLOWED_ORIGINS: allowedOrigin },
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
  });
});
