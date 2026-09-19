// Single place the extension reaches into packages/*. Types only: the content script is a
// thin client and must not bundle matcher or catalog logic (see the extension-mv3 skill).
export type {
  Money,
  Offer,
  PriceContext,
  Retailer,
} from '../../../../packages/catalog/src/schema.js';
import type { Retailer } from '../../../../packages/catalog/src/schema.js';
import type { ComparisonOutcome } from '../../../../packages/matcher/src/types.js';
export type {
  ComparisonOutcome,
  IdentityMatchMethod,
  ProductView,
} from '../../../../packages/matcher/src/types.js';

export type ShowComparison = Extract<ComparisonOutcome, { status: 'show' }>;

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
