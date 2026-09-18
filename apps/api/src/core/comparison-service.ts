import type { Product } from '../../../../packages/catalog/src/schema.js';
import { compareOffers } from '../../../../packages/matcher/src/compare.js';
import { resolveProduct } from '../../../../packages/matcher/src/resolve.js';
import type {
  ComparisonOutcome,
  ProductView,
  RetailerLocationSelection,
  SuppressionReason,
} from '../../../../packages/matcher/src/types.js';
import { ProviderGateway, type ProviderLookupState } from './gateway.js';

function stateReason(state: ProviderLookupState): SuppressionReason {
  if (state === 'timeout') return 'provider-timeout';
  if (state === 'rate-limited') return 'provider-rate-limited';
  if (state === 'invalid-response') return 'invalid-provider-response';
  return 'provider-unavailable';
}

export class ComparisonService {
  constructor(
    private readonly products: Product[],
    private readonly gateway: ProviderGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async compare(
    current: ProductView,
    locations: RetailerLocationSelection = {},
  ): Promise<ComparisonOutcome> {
    const preliminary = compareOffers(this.products, current, [], this.now(), locations);
    if (
      preliminary.status === 'suppressed' ||
      (preliminary.status === 'no-match' && preliminary.reason === 'unknown-product')
    ) {
      return preliminary;
    }

    const resolution = resolveProduct(this.products, current);
    if (resolution.status !== 'matched') return preliminary;
    const catalogAlternatives = resolution.product.identities.filter(
      (identity) => identity.retailer !== current.retailer,
    );
    const alternatives = catalogAlternatives.filter(
      (identity) => current.priceContext === 'online' || locations[identity.retailer],
    );
    if (catalogAlternatives.length === 0) {
      return { status: 'no-match', reason: 'no-alternative-identity' };
    }
    if (alternatives.length === 0) return { status: 'suppressed', reason: 'missing-location' };

    const results = await Promise.all(
      alternatives.map((identity) =>
        this.gateway.lookupOffers(identity.retailer, {
          productId: identity.productId,
          ...(resolution.product.upc ? { upc: resolution.product.upc } : {}),
          url: identity.canonicalUrl,
          priceContext: current.priceContext!,
          ...(current.priceContext !== 'online'
            ? { locationId: locations[identity.retailer]! }
            : {}),
        }),
      ),
    );
    const outcome = compareOffers(
      this.products,
      current,
      results.flatMap((result) => result.offers),
      this.now(),
      locations,
    );
    if (outcome.status === 'show') return outcome;

    const failed = results.find((result) => result.state !== 'ok');
    return failed ? { status: 'suppressed', reason: stateReason(failed.state) } : outcome;
  }
}
