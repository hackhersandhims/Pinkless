/**
 * The Marketplace's data-loading seam. REQUIREMENTS §3: the Marketplace reads
 * the same comparison results as the extension.
 *
 * The Phase 2 API only answers one product view at a time
 * (`POST /api/compare`); there is no list endpoint yet. So `loadComparisons`
 * either fetches a list feed (when `VITE_PINKLESS_API_URL` is set, from the
 * proposed `GET /api/comparisons`) or builds the feed locally. The local build
 * runs every candidate through packages/matcher's `compareOffers()`, the same
 * function behind `POST /api/compare`, so it can never list a comparison the
 * extension would suppress.
 */

import productsJson from '../../../../packages/catalog/products.json';
import { compareOffers } from '../../../../packages/matcher/src/compare.js';
import type {
  ProductView,
  RetailerLocationSelection,
} from '../../../../packages/matcher/src/types.js';
import type {
  ComparisonOffer,
  ComparisonsResponse,
  Offer,
  Product,
  ProductComparison,
} from './types.js';
import mockOffersJson from './fixtures/mock-offers.json';

/** A fixture offer, keyed by the catalog product it prices. */
type MockOffer = Omit<Offer, 'productId' | 'condition'> & { catalogProductId: string };

const products = productsJson as Product[];
const mockOffers = mockOffersJson as MockOffer[];

/**
 * Fixed assembly time for the local feed. Also used as the matcher's "now",
 * so expiry checks are deterministic in tests.
 */
const LOCAL_GENERATED_AT = '2026-09-18T12:00:00.000Z';

/** Fixture offers for a product, as matcher `Offer`s keyed by retailer product ID. */
function offersForProduct(product: Product): Offer[] {
  return mockOffers.flatMap(({ catalogProductId, ...offer }) => {
    if (catalogProductId !== product.id) return [];
    const identity = product.identities.find((candidate) => candidate.retailer === offer.retailer);
    if (!identity) return [];
    return [{ ...offer, productId: identity.productId, condition: 'new' as const }];
  });
}

function toComparisonOffer(offer: Offer): ComparisonOffer | undefined {
  if (offer.availability !== 'in-stock') return undefined;
  const { retailer, url, price, priceContext, locationId, observedAt, expiresAt } = offer;
  return {
    retailer,
    url,
    price,
    priceContext,
    ...(locationId ? { locationId } : {}),
    availability: 'in-stock',
    observedAt,
    expiresAt,
  };
}

/**
 * Lists one comparison for an active product: its most expensive offer stands
 * in for the page a shopper is on, and the matcher picks the cheapest eligible
 * alternative. Anything short of a `show` outcome is omitted, so silence stays
 * the default (REQUIREMENTS §5/§7).
 */
function buildComparison(product: Product, now: Date): ProductComparison | undefined {
  const alternativeOffers = product.reviewedAlternatives.flatMap((relationship) => {
    const alternative = products.find((candidate) => candidate.id === relationship.productId);
    return alternative ? offersForProduct(alternative) : [];
  });
  const outcomes = offersForProduct(product).flatMap((current) => {
    const view: ProductView = {
      retailer: current.retailer,
      canonicalUrl: current.url,
      productId: current.productId,
      ...(product.upc ? { upc: product.upc } : {}),
      title: product.name,
      currentPriceCents: current.price.amountCents,
      currency: current.price.currency,
      priceContext: current.priceContext,
      ...(current.locationId ? { locationId: current.locationId } : {}),
      availability: current.availability,
    };
    const locations: RetailerLocationSelection = current.locationId
      ? { [current.retailer]: current.locationId }
      : {};
    const outcome = compareOffers(products, view, alternativeOffers, now, locations);
    return outcome.status === 'show' ? [{ current, outcome }] : [];
  });
  const selected = outcomes.sort(
    (left, right) => right.outcome.savings.amountCents - left.outcome.savings.amountCents,
  )[0];
  if (!selected) return undefined;

  const reference = toComparisonOffer(selected.current);
  const alternative = toComparisonOffer(selected.outcome.alternative);
  if (!reference || !alternative) return undefined;
  const review = product.reviewedAlternatives.find(
    (candidate) => candidate.productId === selected.outcome.alternativeProduct.id,
  );
  if (!review) return undefined;

  return {
    productId: product.id,
    ...(product.upc ? { upc: product.upc } : {}),
    name: product.name,
    ...(product.brand ? { brand: product.brand } : {}),
    variant: product.variant,
    category: product.category,
    size: product.size,
    alternativeProduct: selected.outcome.alternativeProduct,
    review,
    reference,
    alternative,
    savingsCents: selected.outcome.savings.amountCents,
  };
}

function buildLocalComparisonsResponse(): ComparisonsResponse {
  const now = new Date(LOCAL_GENERATED_AT);
  const comparisons = products
    .filter(
      (product) =>
        product.status === 'active' &&
        product.audience === 'women' &&
        product.reviewedAlternatives.length > 0,
    )
    .map((product) => buildComparison(product, now))
    .filter((comparison): comparison is ProductComparison => comparison !== undefined);

  return { comparisons, generatedAt: LOCAL_GENERATED_AT };
}

/**
 * Loads the comparison feed the Marketplace renders. Fetches the list feed
 * when `VITE_PINKLESS_API_URL` is configured; otherwise builds it locally from
 * the catalog and mock offer fixtures.
 */
export async function loadComparisons(): Promise<ComparisonsResponse> {
  const apiUrl = import.meta.env.VITE_PINKLESS_API_URL;
  if (apiUrl) {
    if (import.meta.env.DEV) {
      console.info(`[pinkless] loading comparisons from API: ${apiUrl}`);
    }
    // Proposed list endpoint; not yet implemented in apps/api.
    const response = await fetch(`${apiUrl}/api/comparisons`);
    if (!response.ok) {
      throw new Error(`Pinkless API returned ${response.status} for /api/comparisons.`);
    }
    return (await response.json()) as ComparisonsResponse;
  }

  if (import.meta.env.DEV) {
    console.info('[pinkless] loading comparisons from local catalog + mock offer fixtures');
  }
  return buildLocalComparisonsResponse();
}
