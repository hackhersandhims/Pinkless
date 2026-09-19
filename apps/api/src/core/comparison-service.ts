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
    const catalogAlternatives = resolution.product.reviewedAlternatives.flatMap((relationship) => {
      const product = this.products.find(
        (candidate) => candidate.id === relationship.productId && candidate.status === 'active',
      );
      if (!product) return [];
      const identity = product.identities.find(
        (candidate) => candidate.retailer === current.retailer,
      );
      return identity ? [{ product, identity }] : [];
    });
    if (catalogAlternatives.length === 0) {
      return { status: 'no-match', reason: 'no-alternative-identity' };
    }

    const results = await Promise.all(
      catalogAlternatives.map(({ product, identity }) =>
        this.gateway.lookupOffers(current.retailer, {
          productId: identity.productId,
          ...(product.upc ? { upc: product.upc } : {}),
          url: identity.canonicalUrl,
          priceContext: current.priceContext!,
          ...(current.priceContext !== 'online' ? { locationId: current.locationId! } : {}),
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
