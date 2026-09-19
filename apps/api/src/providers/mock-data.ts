import type { Product } from '../../../../packages/catalog/src/schema.js';
import { catalog } from '../catalog.js';
import type { MockProviderData } from './mock.js';

export const MOCK_KROGER_LOCATION_ID = 'kroger-1001';

/**
 * Fixture regular prices by Kroger productId, in integer cents. They mirror
 * what Kroger's API returned at store 01400513 on 2026-09-19 so the mock demo
 * looks like live data, but they are fixtures: never shown as observed prices
 * outside `PINKLESS_PROVIDER_MODE=mock`.
 */
const FIXTURE_PRICES: Record<string, number> = {
  '0007033071417': 679,
  '0007033071397': 599,
};

/** Deterministic Kroger fixtures for every catalog product with a fixture price. */
export function createMockData(
  now = new Date(),
  products: Product[] = catalog.products,
): MockProviderData {
  const identities = products.flatMap((product) =>
    product.identities
      .filter((identity) => identity.retailer === 'kroger')
      .map((identity) => ({ product, identity })),
  );
  const priced = identities.filter(({ identity }) => FIXTURE_PRICES[identity.productId]);
  const expiresAt = new Date(now.valueOf() + 60 * 60 * 1000).toISOString();
  return {
    products: identities.map(({ product, identity }) => ({
      retailer: 'kroger',
      productId: identity.productId,
      name: product.name,
      ...(product.brand ? { brand: product.brand } : {}),
      size: `${product.size.amount} ${product.size.unit}`,
    })),
    locations: [
      {
        retailer: 'kroger',
        locationId: MOCK_KROGER_LOCATION_ID,
        name: 'Kroger Downtown (fixture)',
        address: { line1: '1 Demo Way', city: 'Cincinnati', state: 'OH', postalCode: '45202' },
      },
    ],
    offers: priced.flatMap(({ identity }) =>
      (['in-store', 'store-pickup'] as const).map((priceContext) => ({
        retailer: 'kroger' as const,
        productId: identity.productId,
        url: identity.canonicalUrl,
        price: { amountCents: FIXTURE_PRICES[identity.productId]!, currency: 'USD' as const },
        priceContext,
        condition: 'new' as const,
        availability: 'in-stock' as const,
        locationId: MOCK_KROGER_LOCATION_ID,
        observedAt: now.toISOString(),
        expiresAt,
      })),
    ),
  };
}
