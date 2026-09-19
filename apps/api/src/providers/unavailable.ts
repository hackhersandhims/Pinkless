import type { Offer, Retailer } from '../../../../packages/catalog/src/schema.js';
import {
  ProviderError,
  type LocationLookup,
  type OfferLookup,
  type ProductLookup,
  type ProviderProduct,
  type ProviderStatus,
  type RetailerLocation,
  type RetailerProvider,
} from './types.js';

/** A provider shell that cannot accidentally return made-up products or prices. */
export class UnavailableRetailerProvider implements RetailerProvider {
  readonly status: ProviderStatus;

  constructor(
    readonly retailer: Retailer,
    reason: string,
  ) {
    this.status = { available: false, mode: 'unavailable', reason };
  }

  private unavailable(): never {
    const reason = this.status.available ? 'provider unavailable' : this.status.reason;
    throw new ProviderError(this.retailer, 'not-configured', reason);
  }

  async lookupProduct(_query: ProductLookup): Promise<ProviderProduct | null> {
    return this.unavailable();
  }

  async lookupLocations(_query: LocationLookup): Promise<RetailerLocation[]> {
    return this.unavailable();
  }

  async lookupOffers(_query: OfferLookup): Promise<Offer[]> {
    return this.unavailable();
  }
}

export class CvsProvider extends UnavailableRetailerProvider {
  constructor() {
    super('cvs', 'CVS provider requires approved partner or licensed product-and-price data.');
  }
}

export class WalmartProvider extends UnavailableRetailerProvider {
  constructor() {
    super(
      'walmart',
      'Walmart provider requires approved product-and-price data; Marketplace APIs are not used.',
    );
  }
}
