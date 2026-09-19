// Single place the extension reaches into packages/*. Types only: the content script is a
// thin client and must not bundle matcher or catalog logic (see the extension-mv3 skill).
export type {
  Money,
  Offer,
  PriceContext,
  Retailer,
  StorePriceContext,
} from '../../../../packages/catalog/src/schema.js';
export type {
  ComparisonOutcome,
  IdentityMatchMethod,
  ProductSummary,
  ProductView,
  ShowOutcome,
} from '../../../../packages/matcher/src/types.js';

/** A Kroger store as returned by `GET /api/stores`. */
export type StoreLocation = {
  retailer: 'kroger';
  locationId: string;
  name: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
};
