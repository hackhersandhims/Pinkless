import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { RETAILERS, type Retailer } from '../../../../packages/catalog/src/schema.js';
import { MockRetailerProvider, type MockProviderData } from './mock.js';
import { createProviderRegistry } from './registry.js';
import { UnavailableRetailerProvider } from './unavailable.js';

async function fixture(retailer: Retailer): Promise<MockProviderData> {
  const url = new URL(`../../../../fixtures/providers/${retailer}.json`, import.meta.url);
  return JSON.parse(await readFile(url, 'utf8')) as MockProviderData;
}

describe.each(RETAILERS)('%s provider contract fixture', (retailer) => {
  it('returns exact normalized product, location, and time-bounded offer data', async () => {
    const data = await fixture(retailer);
    const provider = new MockRetailerProvider(retailer, data);
    const expectedProduct = data.products[0]!;
    const expectedLocation = data.locations[0]!;
    const expectedOffer = data.offers[0]!;

    await expect(provider.lookupProduct({ upc: expectedProduct.upc })).resolves.toEqual(
      expectedProduct,
    );
    await expect(
      provider.lookupLocations({ postalCode: expectedLocation.address.postalCode }),
    ).resolves.toEqual([expectedLocation]);
    const offers = await provider.lookupOffers({
      upc: expectedProduct.upc,
      url: expectedOffer.url,
      priceContext: expectedOffer.priceContext,
      locationId: expectedOffer.locationId,
    });

    expect(offers).toEqual([expectedOffer]);
    expect(expectedOffer.price.amountCents).toBeGreaterThan(0);
    expect(Number.isSafeInteger(expectedOffer.price.amountCents)).toBe(true);
    expect(new Date(expectedOffer.expiresAt).valueOf()).toBeGreaterThan(
      new Date(expectedOffer.observedAt).valueOf(),
    );
  });

  it('does not create an offer for an unknown identity', async () => {
    const data = await fixture(retailer);
    const provider = new MockRetailerProvider(retailer, data);
    await expect(
      provider.lookupOffers({
        productId: 'unknown',
        url: data.offers[0]!.url,
        priceContext: 'store-pickup',
      }),
    ).resolves.toEqual([]);
  });

  it('does not leak a store-specific offer without the matching location', async () => {
    const data = await fixture(retailer);
    const provider = new MockRetailerProvider(retailer, data);
    await expect(
      provider.lookupOffers({
        productId: data.products[0]!.productId,
        url: data.offers[0]!.url,
        priceContext: 'store-pickup',
      }),
    ).resolves.toEqual([]);
  });
});

describe('unavailable provider shell', () => {
  it.each([new UnavailableRetailerProvider('kroger', 'Kroger credentials are not configured.')])(
    '$retailer fails closed for every lookup',
    async (provider) => {
      await expect(provider.lookupProduct({ upc: '012345678905' })).rejects.toMatchObject({
        code: 'not-configured',
      });
      await expect(provider.lookupLocations({ postalCode: '45202' })).rejects.toMatchObject({
        code: 'not-configured',
      });
      await expect(
        provider.lookupOffers({
          upc: '012345678905',
          url: `https://www.${provider.retailer}.com/product`,
          priceContext: 'in-store',
        }),
      ).rejects.toMatchObject({ code: 'not-configured' });
    },
  );
});

describe('provider registry', () => {
  it('enables deterministic local fixtures only when mock mode is explicit', () => {
    const registry = createProviderRegistry({ PINKLESS_PROVIDER_MODE: 'mock' });
    expect(Object.values(registry).every((provider) => provider.status.available)).toBe(true);
    expect(Object.values(registry).every((provider) => provider.status.mode === 'mock')).toBe(true);
  });

  it('leaves every unconfigured live provider unavailable', () => {
    const registry = createProviderRegistry({});
    expect(Object.values(registry).every((provider) => !provider.status.available)).toBe(true);
  });
});
