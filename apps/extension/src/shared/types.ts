// Single place the extension reaches into packages/*. Types only: the content script is a
// thin client and must not bundle matcher or catalog logic (see the extension-mv3 skill).
export type {
  Money,
  Offer,
  PriceContext,
  Retailer,
} from '../../../../packages/catalog/src/schema.js';
export type {
  ComparisonOutcome,
  IdentityMatchMethod,
  ProductView,
} from '../../../../packages/matcher/src/types.js';
