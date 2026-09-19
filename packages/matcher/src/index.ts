export { compareOffers, equivalentsFor, listComparisons, type Equivalent } from './compare.js';
export {
  alternativeCentsForCurrentSize,
  sameSize,
  sizeAdjustedSavingsCents,
} from './unit-price.js';
export { resolveProduct, type ProductResolution } from './resolve.js';
export type {
  ComparisonOutcome,
  IdentityMatchMethod,
  NoMatchReason,
  ProductSummary,
  ProductView,
  ShowOutcome,
  StoreContext,
  SuppressionReason,
} from './types.js';
