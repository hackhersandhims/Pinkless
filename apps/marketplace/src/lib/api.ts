/**
 * The Marketplace's data-loading seam. REQUIREMENTS §3: the Marketplace calls
 * the same read-only comparison API as the extension. Phase 2 (that API)
 * doesn't exist yet, so `loadComparisons` either calls it (when
 * `VITE_PINKLESS_API_URL` is configured) or builds the identical
 * `ComparisonsResponse` shape locally from the catalog + mock offer
 * fixtures. The local build mirrors the rules the real API will enforce so
 * swapping the env var later changes nothing else.
 */

import productsJson from '../../../../packages/catalog/products.json';
import { savingsCents } from '../../../../packages/matcher/src/comparison.js';
import type {
  ComparisonOffer,
  ComparisonsResponse,
  PriceContext,
  Product,
  ProductComparison,
} from './types.js';
import mockOffersJson from './fixtures/mock-offers.json';

/** One fixture offer: a `ComparisonOffer` plus the catalog product it belongs to. */
type MockOffer = ComparisonOffer & { productId: string };

const products = productsJson as Product[];
const mockOffers = mockOffersJson as MockOffer[];

/** Fixed assembly time for the locally-built response (deterministic for tests). */
const LOCAL_GENERATED_AT = '2026-09-18T12:00:00.000Z';

function offersForProduct(productId: string): MockOffer[] {
  return mockOffers.filter((offer) => offer.productId === productId);
}

function groupByContext(offers: MockOffer[]): Map<PriceContext, MockOffer[]> {
  const groups = new Map<PriceContext, MockOffer[]>();
  for (const offer of offers) {
    const group = groups.get(offer.priceContext);
    if (group) {
      group.push(offer);
    } else {
      groups.set(offer.priceContext, [offer]);
    }
  }
  return groups;
}

function largestGroup(groups: Map<PriceContext, MockOffer[]>): MockOffer[] | undefined {
  let best: MockOffer[] | undefined;
  for (const group of groups.values()) {
    if (!best || group.length > best.length) {
      best = group;
    }
  }
  return best;
}

function toComparisonOffer(offer: MockOffer): ComparisonOffer {
  const { productId: _productId, ...comparisonOffer } = offer;
  return comparisonOffer;
}

/**
 * Builds one `ProductComparison` for an active product, or `undefined` when
 * there aren't at least two in-stock offers in the same price context with a
 * strictly positive spread (REQUIREMENTS §5/§7 — silence is the default).
 */
function buildComparison(product: Product): ProductComparison | undefined {
  const groups = groupByContext(offersForProduct(product.id));
  const contextGroup = largestGroup(groups);
  if (!contextGroup || contextGroup.length < 2) return undefined;

  let highest = contextGroup[0]!;
  let lowest = contextGroup[0]!;
  for (const offer of contextGroup) {
    if (offer.price.amountCents > highest.price.amountCents) highest = offer;
    if (offer.price.amountCents < lowest.price.amountCents) lowest = offer;
  }

  const reference = toComparisonOffer(highest);
  const alternative = toComparisonOffer(lowest);
  const savings = savingsCents(reference, alternative);
  if (savings === null) return undefined;

  return {
    productId: product.id,
    upc: product.upc,
    name: product.name,
    brand: product.brand,
    variant: product.variant,
    category: product.category,
    size: product.size,
    equivalence: product.equivalence,
    reference,
    alternative,
    savingsCents: savings,
  };
}

function buildLocalComparisonsResponse(): ComparisonsResponse {
  const comparisons = products
    .filter((product) => product.status === 'active')
    .map(buildComparison)
    .filter((comparison): comparison is ProductComparison => comparison !== undefined);

  return { comparisons, generatedAt: LOCAL_GENERATED_AT };
}

/**
 * Loads the comparison response the Marketplace renders. Fetches the real
 * Pinkless API when `VITE_PINKLESS_API_URL` is configured; otherwise builds
 * the same shape locally from the catalog and mock offer fixtures.
 */
export async function loadComparisons(): Promise<ComparisonsResponse> {
  const apiUrl = import.meta.env.VITE_PINKLESS_API_URL;
  if (apiUrl) {
    if (import.meta.env.DEV) {
      console.info(`[pinkless] loading comparisons from API: ${apiUrl}`);
    }
    const response = await fetch(`${apiUrl}/comparisons`);
    if (!response.ok) {
      throw new Error(`Pinkless API returned ${response.status} for /comparisons.`);
    }
    return (await response.json()) as ComparisonsResponse;
  }

  if (import.meta.env.DEV) {
    console.info('[pinkless] loading comparisons from local catalog + mock offer fixtures');
  }
  return buildLocalComparisonsResponse();
}
