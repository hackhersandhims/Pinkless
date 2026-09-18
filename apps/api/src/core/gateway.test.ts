import { describe, expect, it, vi } from 'vitest';
import type { Offer } from '../../../../packages/catalog/src/schema.js';
import type { ProviderRegistry } from '../providers/registry.js';
import type { RetailerProvider } from '../providers/types.js';
import { UnavailableRetailerProvider } from '../providers/unavailable.js';
import { ProviderGateway } from './gateway.js';

const now = new Date('2026-09-18T16:30:00.000Z');
const query = {
  productId: 'kroger-razor-1',
  upc: '012345678905',
  url: 'https://www.kroger.com/p/kroger-razor-1',
  priceContext: 'store-pickup',
  locationId: 'kroger-1001',
} as const;

function offer(overrides: Partial<Offer> = {}): Offer {
  return {
    retailer: 'kroger',
    productId: query.productId,
    url: query.url,
    price: { amountCents: 999, currency: 'USD' },
    priceContext: query.priceContext,
    condition: 'new',
    availability: 'in-stock',
    locationId: query.locationId,
    observedAt: '2026-09-18T16:00:00.000Z',
    expiresAt: '2026-09-18T17:00:00.000Z',
    ...overrides,
  };
}

function registry(kroger: RetailerProvider): ProviderRegistry {
  return {
    cvs: new UnavailableRetailerProvider('cvs', 'fixture'),
    kroger,
    walmart: new UnavailableRetailerProvider('walmart', 'fixture'),
  };
}

function provider(lookupOffers: RetailerProvider['lookupOffers']): RetailerProvider {
  return {
    retailer: 'kroger',
    status: { available: true, mode: 'mock' },
    lookupProduct: async () => null,
    lookupLocations: async () => [],
    lookupOffers,
  };
}

describe('ProviderGateway', () => {
  it('caches normalized offers by retailer, identity, location, and context', async () => {
    const lookup = vi.fn(async () => [offer()]);
    const gateway = new ProviderGateway(registry(provider(lookup)), { now: () => now });

    await expect(gateway.lookupOffers('kroger', query)).resolves.toMatchObject({
      state: 'ok',
      cacheHit: false,
    });
    await expect(gateway.lookupOffers('kroger', query)).resolves.toMatchObject({
      state: 'ok',
      cacheHit: true,
    });
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid provider output instead of caching it', async () => {
    const invalid = offer({ productId: 'wrong-product' });
    const gateway = new ProviderGateway(registry(provider(async () => [invalid])), {
      now: () => now,
    });
    await expect(gateway.lookupOffers('kroger', query)).resolves.toMatchObject({
      state: 'invalid-response',
      offers: [],
    });
  });

  it('applies provider timeouts and rate limits', async () => {
    const timeoutGateway = new ProviderGateway(
      registry(provider(() => new Promise<Offer[]>(() => undefined))),
      { now: () => now, timeoutMs: 5 },
    );
    await expect(timeoutGateway.lookupOffers('kroger', query)).resolves.toMatchObject({
      state: 'timeout',
    });

    const rateGateway = new ProviderGateway(registry(provider(async () => [])), {
      now: () => now,
      maxRequestsPerWindow: 1,
    });
    await rateGateway.lookupOffers('kroger', query);
    await expect(
      rateGateway.lookupOffers('kroger', { ...query, locationId: 'kroger-1002' }),
    ).resolves.toMatchObject({ state: 'rate-limited' });
  });

  it('never calls unavailable providers', async () => {
    const gateway = new ProviderGateway(
      registry(new UnavailableRetailerProvider('kroger', 'fixture')),
      { now: () => now },
    );
    await expect(gateway.lookupOffers('kroger', query)).resolves.toMatchObject({
      state: 'unavailable',
      offers: [],
    });
  });
});
