import { describe, expect, it } from 'vitest';
import type { Product, Retailer } from '../../../../packages/catalog/src/schema.js';
import { ComparisonService } from '../core/comparison-service.js';
import { ProviderGateway } from '../core/gateway.js';
import { createMockData } from '../providers/mock-data.js';
import { MockRetailerProvider } from '../providers/mock.js';
import type { ProviderRegistry } from '../providers/registry.js';
import { UnavailableRetailerProvider } from '../providers/unavailable.js';
import { createCompareHandler } from './compare.js';
import { optionsResponse } from './http.js';
import { createStoresHandler } from './stores.js';

const now = new Date('2026-09-18T16:30:00.000Z');
const allowedOrigin = 'http://localhost:5173';

const identityDetails = {
  cvs: {
    productId: 'cvs-razor-1',
    url: 'https://www.cvs.com/shop/sample-razor-prodid-cvs-razor-1',
  },
  kroger: {
    productId: '00012345678905',
    url: 'https://www.kroger.com/p/sample-razor/00012345678905',
  },
  walmart: {
    productId: 'walmart-razor-1',
    url: 'https://www.walmart.com/ip/sample-razor/walmart-razor-1',
  },
} as const;

const alternativeIdentityDetails = {
  amazon: {
    productId: 'B000000002',
    url: 'https://www.amazon.com/dp/B000000002',
  },
  cvs: {
    productId: 'cvs-mens-razor-1',
    url: 'https://www.cvs.com/shop/mens-razor-prodid-cvs-mens-razor-1',
  },
  kroger: {
    productId: '00036000291452',
    url: 'https://www.kroger.com/p/mens-razor/00036000291452',
  },
  walmart: {
    productId: 'walmart-mens-razor-1',
    url: 'https://www.walmart.com/ip/mens-razor/walmart-mens-razor-1',
  },
} as const;

function catalogProduct(): Product {
  return {
    id: 'sample-razor',
    upc: '012345678905',
    name: 'Sample Razor',
    brand: 'Sample Brand',
    variant: 'One handle',
    category: 'razors',
    audience: 'women',
    size: { amount: 1, unit: 'count' },
    identities: (Object.keys(identityDetails) as Array<keyof typeof identityDetails>).map(
      (retailer) => {
        const details = identityDetails[retailer];
        return {
          retailer,
          productId: details.productId,
          canonicalUrl: details.url,
          canonicalUrlPatterns: [`^${details.url.replaceAll('.', '\\.')}$`],
        };
      },
    ),
    equivalence: {
      policy: 'exact-packaged-product',
      rationale: 'All identities use the same UPC and package size.',
      matchedAttributes: ['UPC', 'package size'],
    },
    reviewedAlternatives: [
      {
        productId: 'mens-razor',
        rationale: "Reviewed men's razor with the same blade and package count.",
        matchedAttributes: ['blade count', 'package size'],
      },
    ],
    status: 'active',
  };
}

function catalogAlternative(): Product {
  return {
    id: 'mens-razor',
    upc: '036602301972',
    name: "Men's Sample Razor",
    brand: 'Sample Brand',
    variant: 'One handle',
    category: 'razors',
    audience: 'men',
    size: { amount: 1, unit: 'count' },
    identities: (Object.keys(alternativeIdentityDetails) as Retailer[]).map((retailer) => {
      const details = alternativeIdentityDetails[retailer];
      return {
        retailer,
        productId: details.productId,
        canonicalUrl: details.url,
        canonicalUrlPatterns: [`^${details.url.replaceAll('.', '\\.')}$`],
      };
    }),
    equivalence: {
      policy: 'exact-packaged-product',
      rationale: 'Every identity is the same packaged men product.',
      matchedAttributes: ['UPC', 'package size'],
    },
    reviewedAlternatives: [],
    status: 'active',
  };
}

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
  return {
    amazon: new MockRetailerProvider('amazon', mockDataWithAlternative('amazon')),
    cvs: new MockRetailerProvider('cvs', mockDataWithAlternative('cvs')),
    kroger: new MockRetailerProvider('kroger', mockDataWithAlternative('kroger')),
    walmart: new MockRetailerProvider('walmart', mockDataWithAlternative('walmart')),
  };
}

function compareBody() {
  return {
    current: {
      retailer: 'cvs',
      canonicalUrl: identityDetails.cvs.url,
      productId: identityDetails.cvs.productId,
      upc: '012345678905',
      title: 'Sample Razor',
      selectedVariant: 'One handle',
      currentPriceCents: 1299,
      currency: 'USD',
      priceContext: 'store-pickup',
      locationId: 'cvs-1001',
      availability: 'in-stock',
    },
    locations: {
      cvs: 'cvs-1001',
      kroger: 'kroger-1001',
      walmart: 'walmart-1001',
    },
  };
}

function compareHandler(registry = mockRegistry(), nodeEnv = 'test') {
  const gateway = new ProviderGateway(registry, { now: () => now });
  const service = new ComparisonService(
    [catalogProduct(), catalogAlternative()],
    gateway,
    () => now,
  );
  return createCompareHandler(service, {
    NODE_ENV: nodeEnv,
    PINKLESS_ALLOWED_ORIGINS: allowedOrigin,
  });
}

function post(body: unknown, origin = allowedOrigin): Request {
  return new Request('https://pinkless.test/api/compare', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('comparison route', () => {
  it('returns a verified men alternative from the current retailer only', async () => {
    const response = await compareHandler()(post(compareBody()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'show',
      alternative: { retailer: 'cvs', price: { amountCents: 899 } },
      alternativeProduct: { id: 'mens-razor', audience: 'men' },
      savings: { amountCents: 400, currency: 'USD' },
    });
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
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

  it('suppresses a comparison when alternative providers are unavailable', async () => {
    const registry: ProviderRegistry = {
      amazon: new UnavailableRetailerProvider('amazon', 'fixture'),
      cvs: new UnavailableRetailerProvider('cvs', 'fixture'),
      kroger: new UnavailableRetailerProvider('kroger', 'fixture'),
      walmart: new UnavailableRetailerProvider('walmart', 'fixture'),
    };
    const response = await compareHandler(registry)(post(compareBody()));
    await expect(response.json()).resolves.toEqual({
      status: 'suppressed',
      reason: 'provider-unavailable',
    });
  });
});

describe('stores route', () => {
  it('returns normalized provider locations', async () => {
    const gateway = new ProviderGateway(mockRegistry(), { now: () => now });
    const handler = createStoresHandler(gateway, {
      NODE_ENV: 'test',
      PINKLESS_ALLOWED_ORIGINS: allowedOrigin,
    });
    const response = await handler(
      new Request('https://pinkless.test/api/stores?retailer=kroger&postalCode=45202', {
        headers: { origin: allowedOrigin },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      locations: [{ retailer: 'kroger', locationId: 'kroger-1001' }],
    });
  });

  it('rejects unsupported retailers', async () => {
    const handler = createStoresHandler(new ProviderGateway(mockRegistry()), {
      NODE_ENV: 'test',
      PINKLESS_ALLOWED_ORIGINS: allowedOrigin,
    });
    const response = await handler(
      new Request('https://pinkless.test/api/stores?retailer=target&postalCode=45202', {
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
