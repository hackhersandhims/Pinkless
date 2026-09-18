/** Pure transforms from the API's `ProductComparison` shape to the view contract. */

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PRICE_CONTEXT_LABELS,
  RETAILER_LABELS,
} from './types.js';

const RETAILER_ORDER = Object.keys(RETAILER_LABELS) as Retailer[];
import type {
  CategoryGroup,
  CategorySlug,
  ComparisonsResponse,
  ComparisonView,
  OfferView,
  ProductComparison,
  Retailer,
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

export type SortKey = 'savings' | 'price' | 'name';

export const SORT_LABELS: Record<SortKey, string> = {
  savings: 'Biggest savings',
  price: 'Lowest price',
  name: 'Name A to Z',
};

function compareIds(a: ComparisonView, b: ComparisonView): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** A sorted copy. Ties fall back to product id so the order is stable. */
export function sortComparisons(items: ComparisonView[], key: SortKey): ComparisonView[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const primary =
      key === 'savings'
        ? b.savingsCents - a.savingsCents
        : key === 'price'
          ? a.alternative.priceCents - b.alternative.priceCents
          : a.name.localeCompare(b.name);
    return primary !== 0 ? primary : compareIds(a, b);
  });
  return sorted;
}

/**
 * Text filter over the comparisons already listed. Every whitespace-separated
 * term must appear in the product's name, brand, variant, category, or either
 * retailer. This narrows the feed for browsing only; it never decides whether
 * a comparison exists, so matching stays with packages/matcher.
 */
export function searchComparisons(items: ComparisonView[], query: string): ComparisonView[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.brand ?? '',
      item.variant,
      item.categoryLabel,
      item.reference.retailerLabel,
      item.alternative.retailerLabel,
    ]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Retailers that are the cheaper side of at least one comparison, in fixed order. */
export function alternativeRetailers(items: ComparisonView[]): Retailer[] {
  const present = new Set(items.map((item) => item.alternative.retailer));
  return RETAILER_ORDER.filter((retailer) => present.has(retailer));
}

export type FeedSummary = {
  count: number;
  /** Largest single saving, integer cents. Undefined for an empty feed. */
  maxSavingsCents: number | undefined;
  /** Every retailer that appears on either side of a listed comparison. */
  retailers: Retailer[];
};

/** Headline numbers for the home hero, derived only from the listed comparisons. */
export function summarizeFeed(items: ComparisonView[]): FeedSummary {
  const present = new Set<Retailer>();
  let maxSavingsCents: number | undefined;
  for (const item of items) {
    present.add(item.reference.retailer);
    present.add(item.alternative.retailer);
    if (maxSavingsCents === undefined || item.savingsCents > maxSavingsCents) {
      maxSavingsCents = item.savingsCents;
    }
  }
  return {
    count: items.length,
    maxSavingsCents,
    retailers: RETAILER_ORDER.filter((retailer) => present.has(retailer)),
  };
}
