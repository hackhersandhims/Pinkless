import type { Catalog, Offer, Product } from '../../../../packages/catalog/src/schema.js';
import {
  compareOffers,
  equivalentsFor,
  listComparisons,
} from '../../../../packages/matcher/src/compare.js';
import { resolveProduct } from '../../../../packages/matcher/src/resolve.js';
import type {
  ComparisonOutcome,
  ProductView,
  ShowOutcome,
  StoreContext,
  SuppressionReason,
} from '../../../../packages/matcher/src/types.js';
import { ProviderGateway, type OfferLookupResult, type ProviderLookupState } from './gateway.js';

function stateReason(state: ProviderLookupState): SuppressionReason {
  if (state === 'timeout') return 'provider-timeout';
  if (state === 'rate-limited') return 'provider-rate-limited';
  if (state === 'invalid-response') return 'invalid-provider-response';
  return 'provider-unavailable';
}

export type ListResult =
  | { status: 'ok'; comparisons: ShowOutcome[] }
  | { status: 'suppressed'; reason: SuppressionReason };

const LOOKUP_CONCURRENCY = 8;

export class ComparisonService {
  constructor(
    private readonly catalog: Catalog,
    private readonly gateway: ProviderGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Prices every Kroger identity of the given products at one store, at most
   * `LOOKUP_CONCURRENCY` at a time so a large catalog doesn't burst the provider.
   */
  private async priceProducts(
    products: Product[],
    store: StoreContext,
  ): Promise<OfferLookupResult[]> {
    const lookups = products.flatMap((product) =>
      product.identities.map(
        (identity) => () =>
          this.gateway.lookupOffers(identity.retailer, {
            productId: identity.productId,
            url: identity.canonicalUrl,
            priceContext: store.priceContext,
            locationId: store.locationId,
          }),
      ),
    );
    const results: OfferLookupResult[] = new Array(lookups.length);
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < lookups.length) {
        const index = next++;
        results[index] = await lookups[index]!();
      }
    };
    await Promise.all(Array.from({ length: Math.min(LOOKUP_CONCURRENCY, lookups.length) }, worker));
    return results;
  }

  /**
   * Compares the shopper's page against its reviewed equivalents. Both sides
   * are priced by the provider; the page's own price is only a consistency
   * check inside the matcher.
   */
  async compare(current: ProductView): Promise<ComparisonOutcome> {
    // Runs every page-state check with no offers, so a bad request never
    // reaches the provider.
    const preliminary = compareOffers(this.catalog, current, [], this.now());
    if (preliminary.status !== 'suppressed' || preliminary.reason !== 'current-offer-unavailable') {
      return preliminary;
    }
    const resolution = resolveProduct(this.catalog.products, current);
    if (resolution.status !== 'matched') return preliminary;

    const store: StoreContext = {
      locationId: current.locationId!,
      priceContext: current.priceContext!,
    };
    const products = [
      resolution.product,
      ...equivalentsFor(this.catalog, resolution.product.id).map(({ product }) => product),
    ];
    const results = await this.priceProducts(products, store);
    const outcome = compareOffers(
      this.catalog,
      current,
      results.flatMap((result) => result.offers),
      this.now(),
    );
    if (outcome.status === 'show') return outcome;

    const failed = results.find((result) => result.state !== 'ok');
    return failed ? { status: 'suppressed', reason: stateReason(failed.state) } : outcome;
  }

  /** Every active pair with a positive saving at one store (Marketplace list feed). */
  async list(store: StoreContext): Promise<ListResult> {
    const byId = new Map(this.catalog.products.map((product) => [product.id, product]));
    const ids = new Set(
      this.catalog.equivalences
        .filter((equivalence) => equivalence.status === 'active')
        .flatMap((equivalence) => equivalence.productIds),
    );
    const products = [...ids].flatMap((id) => {
      const product = byId.get(id);
      return product && product.status === 'active' ? [product] : [];
    });
    const results = await this.priceProducts(products, store);
    // A product whose lookup failed has no offers, so its pairs stay out of the
    // list (suppress by default). Only a total failure suppresses the whole list.
    const failed = results.find((result) => result.state !== 'ok');
    if (failed && results.every((result) => result.state !== 'ok')) {
      return { status: 'suppressed', reason: stateReason(failed.state) };
    }
    const offers: Offer[] = results.flatMap((result) => result.offers);
    return { status: 'ok', comparisons: listComparisons(this.catalog, offers, store, this.now()) };
  }
}
