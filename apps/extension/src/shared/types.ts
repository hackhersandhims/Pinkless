import type { Retailer } from './config.js';

export type Money = { amountCents: number; currency: 'USD' };
export type PriceContext = 'online' | 'store-pickup' | 'in-store';

export type ShowComparison = {
  status: 'show';
  product: {
    id: string;
    name: string;
    brand?: string;
    variant: string;
    size: { amount: number; unit: 'oz' | 'ml' | 'count' };
  };
  current: {
    retailer: Retailer;
    price: Money;
    priceContext: PriceContext;
    locationId?: string;
  };
  alternative: {
    retailer: Retailer;
    productId: string;
    url: string;
    price: Money;
    priceContext: PriceContext;
    condition: 'new';
    availability: 'in-stock';
    locationId?: string;
    observedAt: string;
    expiresAt: string;
  };
  savings: Money;
  rationale: string;
  matchedBy: 'upc' | 'retailer-product-id' | 'canonical-url';
};

export type ComparisonApiResponse =
  | ShowComparison
  | { status: 'no-match'; reason?: string }
  | { status: 'suppressed'; reason?: string };

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
