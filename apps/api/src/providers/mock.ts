import type { Offer, Retailer } from '../../../../packages/catalog/src/schema.js';
import type {
  LocationLookup,
  OfferLookup,
  ProductLookup,
  ProviderProduct,
  RetailerLocation,
  RetailerProvider,
} from './types.js';

export type MockProviderData = {
  products: ProviderProduct[];
  locations: RetailerLocation[];
  offers: Offer[];
};

function productMatches(product: ProviderProduct, query: ProductLookup): boolean {
  if (!query.productId && !query.upc) return false;
  if (query.productId && product.productId !== query.productId) return false;
  if (query.upc && product.upc !== query.upc) return false;
  return true;
}

export class MockRetailerProvider implements RetailerProvider {
  readonly status = { available: true, mode: 'mock' } as const;

  constructor(
    readonly retailer: Retailer,
    private readonly data: MockProviderData,
  ) {
    if (
      [...data.products, ...data.locations, ...data.offers].some(
        (entry) => entry.retailer !== retailer,
      )
    ) {
      throw new Error(`Mock ${retailer} provider data contains another retailer.`);
    }
  }

  async lookupProduct(query: ProductLookup): Promise<ProviderProduct | null> {
    return this.data.products.find((product) => productMatches(product, query)) ?? null;
  }

  async lookupLocations(query: LocationLookup): Promise<RetailerLocation[]> {
    const limit = Math.max(1, Math.min(query.limit ?? 10, 50));
    return this.data.locations
      .filter((location) => location.address.postalCode === query.postalCode)
      .slice(0, limit);
  }

  async lookupOffers(query: OfferLookup): Promise<Offer[]> {
    const product = await this.lookupProduct(query);
    if (!product) return [];
    return this.data.offers.filter(
      (offer) =>
        offer.productId === product.productId &&
        offer.priceContext === query.priceContext &&
        (query.locationId
          ? offer.locationId === query.locationId
          : offer.locationId === undefined) &&
        offer.url === query.url,
    );
  }
}
