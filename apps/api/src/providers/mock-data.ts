import type { Retailer } from '../../../../packages/catalog/src/schema.js';
import type { MockProviderData } from './mock.js';

const DETAILS = {
  cvs: {
    productId: 'cvs-razor-1',
    locationId: 'cvs-1001',
    name: 'CVS Downtown',
    url: 'https://www.cvs.com/shop/sample-razor-prodid-cvs-razor-1',
    price: 1099,
  },
  kroger: {
    productId: '00012345678905',
    locationId: 'kroger-1001',
    name: 'Kroger Downtown',
    url: 'https://www.kroger.com/p/sample-razor/00012345678905',
    price: 999,
  },
  walmart: {
    productId: 'walmart-razor-1',
    locationId: 'walmart-1001',
    name: 'Walmart Downtown',
    url: 'https://www.walmart.com/ip/sample-razor/walmart-razor-1',
    price: 899,
  },
} as const;

export function createMockData(retailer: Retailer, now = new Date()): MockProviderData {
  const details = DETAILS[retailer];
  return {
    products: [
      {
        retailer,
        productId: details.productId,
        upc: '012345678905',
        name: 'Sample Razor',
        brand: 'Sample Brand',
        size: '1 count',
      },
    ],
    locations: [
      {
        retailer,
        locationId: details.locationId,
        name: details.name,
        address: {
          line1: '1 Demo Way',
          city: 'Cincinnati',
          state: 'OH',
          postalCode: '45202',
        },
      },
    ],
    offers: [
      {
        retailer,
        productId: details.productId,
        url: details.url,
        price: { amountCents: details.price, currency: 'USD' },
        priceContext: 'store-pickup',
        condition: 'new',
        availability: 'in-stock',
        locationId: details.locationId,
        observedAt: now.toISOString(),
        expiresAt: new Date(now.valueOf() + 60 * 60 * 1000).toISOString(),
      },
    ],
  };
}
