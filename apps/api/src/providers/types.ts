import type { Offer, PriceContext, Retailer } from '../../../../packages/catalog/src/schema.js';

export type ProductLookup = {
  productId?: string;
  upc?: string;
  locationId?: string;
};

export type OfferLookup = ProductLookup & {
  /** Reviewed HTTPS product URL; providers must not synthesize outbound links. */
  url: string;
  priceContext: PriceContext;
};

export type LocationLookup = {
  postalCode: string;
  radiusMiles?: number;
  limit?: number;
};

export type ProviderProduct = {
  retailer: Retailer;
  productId: string;
  upc?: string;
  name: string;
  brand?: string;
  size?: string;
};

export type RetailerLocation = {
  retailer: Retailer;
  locationId: string;
  name: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
};

export type ProviderStatus =
  | { available: true; mode: 'live' | 'mock' }
  | { available: false; mode: 'unavailable'; reason: string };

export interface RetailerProvider {
  readonly retailer: Retailer;
  readonly status: ProviderStatus;
  lookupProduct(query: ProductLookup): Promise<ProviderProduct | null>;
  lookupLocations(query: LocationLookup): Promise<RetailerLocation[]>;
  lookupOffers(query: OfferLookup): Promise<Offer[]>;
}

export type ProviderFailureCode =
  'not-configured' | 'invalid-request' | 'upstream-error' | 'invalid-response';

export class ProviderError extends Error {
  constructor(
    readonly retailer: Retailer,
    readonly code: ProviderFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
