import type { Retailer } from '../../../../packages/catalog/src/schema.js';
import type { MockProviderData } from './mock.js';

type MockDetails = {
  productId: string;
  locationId?: string;
  name: string;
  url: string;
  price: number;
};

const DETAILS: Record<Retailer, MockDetails> = {
  amazon: {
    productId: 'B000000001',
    name: 'Amazon Online',
    url: 'https://www.amazon.com/dp/B000000001',
    price: 899,
  },
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

const ALTERNATIVE_DETAILS: Record<Retailer, Pick<MockDetails, 'productId' | 'url' | 'price'>> = {
  amazon: {
    productId: 'B000000002',
    url: 'https://www.amazon.com/dp/B000000002',
    price: 699,
  },
  cvs: {
    productId: 'cvs-razor-2',
    url: 'https://www.cvs.com/shop/daily-comfort-disposable-razor-prodid-cvs-razor-2',
    price: 699,
  },
  kroger: {
    productId: '00036000291452',
    url: 'https://www.kroger.com/p/daily-comfort-razor/00036000291452',
    price: 649,
  },
  walmart: {
    productId: 'walmart-razor-2',
    url: 'https://www.walmart.com/ip/daily-comfort-disposable-razor/walmart-razor-2',
    price: 599,
  },
};

export function createMockData(retailer: Retailer, now = new Date()): MockProviderData {
  const details = DETAILS[retailer];
  const alternative = ALTERNATIVE_DETAILS[retailer];
  const isOnlineOnly = retailer === 'amazon';
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
      {
        retailer,
        productId: alternative.productId,
        upc: '036000291452',
        name: "Men's Daily Comfort Razor",
        brand: 'Northbank',
        size: '4 count',
      },
    ],
    locations: isOnlineOnly
      ? []
      : [
          {
            retailer,
            locationId: details.locationId!,
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
        priceContext: isOnlineOnly ? 'online' : 'store-pickup',
        condition: 'new',
        availability: 'in-stock',
        ...(isOnlineOnly ? {} : { locationId: details.locationId! }),
        observedAt: now.toISOString(),
        expiresAt: new Date(now.valueOf() + 60 * 60 * 1000).toISOString(),
      },
      {
        retailer,
        productId: alternative.productId,
        url: alternative.url,
        price: { amountCents: alternative.price, currency: 'USD' },
        priceContext: isOnlineOnly ? 'online' : 'store-pickup',
        condition: 'new',
        availability: 'in-stock',
        ...(isOnlineOnly ? {} : { locationId: details.locationId! }),
        observedAt: now.toISOString(),
        expiresAt: new Date(now.valueOf() + 60 * 60 * 1000).toISOString(),
      },
    ],
  };
}
