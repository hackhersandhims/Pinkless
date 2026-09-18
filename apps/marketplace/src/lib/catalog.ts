/** Pure transforms from the API's `ProductComparison` shape to the view contract. */

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PRICE_CONTEXT_LABELS,
  RETAILER_LABELS,
} from './types.js';
import type {
  CategoryGroup,
  CategorySlug,
  ComparisonsResponse,
  ComparisonView,
  OfferView,
  ProductComparison,
} from './types.js';

function toOfferView(offer: ProductComparison['reference']): OfferView {
  return {
    retailer: offer.retailer,
    retailerLabel: RETAILER_LABELS[offer.retailer],
    url: offer.url,
    priceCents: offer.price.amountCents,
    priceContext: offer.priceContext,
    priceContextLabel: PRICE_CONTEXT_LABELS[offer.priceContext],
    observedAt: offer.observedAt,
  };
}

/** Flattens one API comparison into the shape every component renders. */
export function toView(comparison: ProductComparison): ComparisonView {
  return {
    id: comparison.productId,
    category: comparison.category,
    categoryLabel: CATEGORY_LABELS[comparison.category],
    name: comparison.name,
    brand: comparison.brand,
    variant: comparison.variant,
    size: comparison.size,
    upc: comparison.upc,
    reference: toOfferView(comparison.reference),
    alternative: toOfferView(comparison.alternative),
    savingsCents: comparison.savingsCents,
    rationale: comparison.equivalence.rationale,
    matchedAttributes: comparison.equivalence.matchedAttributes,
    knownDifferences: comparison.equivalence.knownDifferences ?? [],
  };
}

const CATEGORY_RANK: Record<CategorySlug, number> = Object.fromEntries(
  CATEGORY_ORDER.map((slug, index) => [slug, index]),
) as Record<CategorySlug, number>;

/**
 * All comparisons from the response, converted to views and stably sorted by
 * `CATEGORY_ORDER` then by product id.
 */
export function getActiveComparisons(response: ComparisonsResponse): ComparisonView[] {
  return response.comparisons
    .map(toView)
    .sort((a, b) => {
      const rankDiff = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
      if (rankDiff !== 0) return rankDiff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

/** Groups already-sorted comparison views by category, in `CATEGORY_ORDER`, omitting empty categories. */
export function groupByCategory(items: ComparisonView[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  for (const slug of CATEGORY_ORDER) {
    const categoryItems = items.filter((item) => item.category === slug);
    if (categoryItems.length === 0) continue;
    groups.push({ slug, label: CATEGORY_LABELS[slug], items: categoryItems });
  }
  return groups;
}

/** Finds one comparison view by product id. */
export function getComparison(items: ComparisonView[], id: string): ComparisonView | undefined {
  return items.find((item) => item.id === id);
}
