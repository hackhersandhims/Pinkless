/** Pure transforms from the API's `ShowOutcome`s to the view contract. */

import { sizeAdjustedSavingsCents } from '../../../../packages/matcher/src/unit-price.js';
import { percentLower } from './money.js';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MARKETED_TO_LABELS,
  PRICE_CONTEXT_LABELS,
  VERSION_LABELS,
} from './types.js';
import type {
  CategoryGroup,
  CategorySlug,
  ComparisonsResponse,
  ComparisonView,
  Offer,
  ProductSide,
  ProductSummary,
  SelectedStore,
  ShowOutcome,
} from './types.js';
import { BLANK_KROGER_PHOTOS } from './blank-photos.js';

function isPositiveCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isKrogerUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'kroger.com' || url.hostname.endsWith('.kroger.com'))
    );
  } catch {
    return false;
  }
}

function validOffer(offer: Offer, locationId: string, priceContext: string): boolean {
  return (
    offer.retailer === 'kroger' &&
    offer.availability === 'in-stock' &&
    offer.price?.currency === 'USD' &&
    isPositiveCents(offer.price.amountCents) &&
    offer.locationId === locationId &&
    offer.priceContext === priceContext &&
    isKrogerUrl(offer.url) &&
    isDate(offer.observedAt) &&
    typeof offer.productId === 'string'
  );
}

function toSide(product: ProductSummary, offer: Offer): ProductSide {
  return {
    id: product.id,
    krogerProductId: offer.productId,
    name: product.name,
    ...(product.brand ? { brand: product.brand } : {}),
    variant: product.variant,
    size: product.size,
    marketedTo: product.marketedTo,
    marketedToLabel: MARKETED_TO_LABELS[product.marketedTo],
    url: offer.url,
    priceCents: offer.price.amountCents,
    observedAt: offer.observedAt,
  };
}

/**
 * Flattens one API comparison into the shape every component renders, or
 * `undefined` when anything about it is inconsistent (wrong direction,
 * different stores or contexts, savings that don't add up). The Marketplace
 * fails closed: it never shows a comparison it cannot account for.
 */
export function toView(
  outcome: ShowOutcome,
  response: Pick<ComparisonsResponse, 'store'>,
  storeName?: string,
): ComparisonView | undefined {
  const { locationId, priceContext } = response.store;
  const { product, alternativeProduct, current, alternative } = outcome;
  if (outcome.status !== 'show' || !product || !alternativeProduct || !current || !alternative) {
    return undefined;
  }
  if (priceContext === 'online') return undefined;
  if (product.marketedTo !== 'women' || alternativeProduct.marketedTo === 'women') return undefined;
  if (
    !CATEGORY_ORDER.includes(product.category) ||
    product.category !== alternativeProduct.category
  ) {
    return undefined;
  }
  if (
    !validOffer(current, locationId, priceContext) ||
    !validOffer(alternative, locationId, priceContext)
  ) {
    return undefined;
  }
  const savingsCents = sizeAdjustedSavingsCents(
    current.price.amountCents,
    product.size,
    alternative.price.amountCents,
    alternativeProduct.size,
  );
  if (!savingsCents || savingsCents <= 0 || outcome.savings?.amountCents !== savingsCents) {
    return undefined;
  }
  const perUnit =
    product.size.unit !== alternativeProduct.size.unit ||
    product.size.amount !== alternativeProduct.size.amount;

  const other = toSide(alternativeProduct, alternative) as ComparisonView['other'];
  const observedAt =
    Date.parse(current.observedAt) <= Date.parse(alternative.observedAt)
      ? current.observedAt
      : alternative.observedAt;
  const percent = percentLower(savingsCents, current.price.amountCents);

  return {
    id: outcome.equivalenceId,
    category: product.category,
    categoryLabel: CATEGORY_LABELS[product.category],
    womens: toSide(product, current),
    other,
    versionLabel: VERSION_LABELS[other.marketedTo],
    store: { locationId, ...(storeName ? { name: storeName } : {}) },
    priceContext,
    priceContextLabel: PRICE_CONTEXT_LABELS[priceContext],
    observedAt,
    savingsCents,
    perUnit,
    ...(percent !== undefined ? { percentLower: percent } : {}),
    rationale: outcome.rationale,
    matchedAttributes: [...(outcome.matchedAttributes ?? [])],
    knownDifferences: [...(outcome.knownDifferences ?? [])],
  };
}

const CATEGORY_RANK: Record<CategorySlug, number> = Object.fromEntries(
  CATEGORY_ORDER.map((slug, index) => [slug, index]),
) as Record<CategorySlug, number>;

function compareIds(a: ComparisonView, b: ComparisonView): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Every valid comparison in the response as a view, sorted by
 * `CATEGORY_ORDER`, then id. Inconsistent entries are dropped.
 */
export function getActiveComparisons(
  response: ComparisonsResponse,
  storeName?: string,
): ComparisonView[] {
  return response.comparisons
    .map((outcome) => toView(outcome, response, storeName))
    .filter((view): view is ComparisonView => view !== undefined)
    .sort((a, b) => CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] || compareIds(a, b));
}

/** Groups comparison views by category, in `CATEGORY_ORDER`, omitting empty categories. */
export function groupByCategory(items: ComparisonView[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  for (const slug of CATEGORY_ORDER) {
    const categoryItems = items.filter((item) => item.category === slug);
    if (categoryItems.length === 0) continue;
    groups.push({ slug, label: CATEGORY_LABELS[slug], items: categoryItems });
  }
  return groups;
}

/** Finds one comparison view by equivalence id. */
export function getComparison(items: ComparisonView[], id: string): ComparisonView | undefined {
  return items.find((item) => item.id === id);
}

export type SortKey = 'savings' | 'price' | 'name';

export const SORT_LABELS: Record<SortKey, string> = {
  savings: 'Biggest difference',
  price: 'Lowest price',
  name: 'Name A to Z',
};

/** A sorted copy. Ties fall back to id so the order is stable. */
export function sortComparisons(items: ComparisonView[], key: SortKey): ComparisonView[] {
  return [...items].sort((a, b) => {
    const primary =
      key === 'savings'
        ? b.savingsCents - a.savingsCents
        : key === 'price'
          ? a.other.priceCents - b.other.priceCents
          : a.womens.name.localeCompare(b.womens.name);
    return primary !== 0 ? primary : compareIds(a, b);
  });
}

/**
 * Text filter over the comparisons already listed. Every whitespace-separated
 * term must appear in either product's name, brand, or variant, or the
 * category. This narrows the feed for browsing only; it never decides whether
 * a comparison exists, so matching stays with packages/matcher.
 */
export function searchComparisons(items: ComparisonView[], query: string): ComparisonView[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((item) => {
    const haystack = [item.womens, item.other]
      .flatMap((side) => [side.name, side.brand ?? '', side.variant])
      .concat(item.categoryLabel)
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export type FeedSummary = {
  count: number;
  /** Largest single difference, integer cents. Undefined for an empty feed. */
  maxSavingsCents: number | undefined;
};

/** Headline numbers for the home page, derived only from the listed comparisons. */
export function summarizeFeed(items: ComparisonView[]): FeedSummary {
  let maxSavingsCents: number | undefined;
  for (const item of items) {
    if (maxSavingsCents === undefined || item.savingsCents > maxSavingsCents) {
      maxSavingsCents = item.savingsCents;
    }
  }
  return { count: items.length, maxSavingsCents };
}

/** "Kroger On the Rhine", or "Kroger store 01400513" when only the ID is known. */
export function storeLabel(store: SelectedStore): string {
  return store.name ?? `Kroger store ${store.locationId}`;
}

/**
 * Kroger's product photo for a 13-digit Kroger product ID, or undefined for
 * anything else, including products whose photo is Kroger's blank placeholder
 * (see blank-photos.ts). Rendered with a local illustration as the fallback.
 */
export function krogerImageUrl(
  krogerProductId: string,
  resolution: 'medium' | 'large' = 'medium',
): string | undefined {
  return /^\d{13}$/.test(krogerProductId) && !BLANK_KROGER_PHOTOS.has(krogerProductId)
    ? `https://www.kroger.com/product/images/${resolution}/front/${krogerProductId}`
    : undefined;
}
