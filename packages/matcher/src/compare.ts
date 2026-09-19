import type {
  Catalog,
  Offer,
  Product,
  ProductEquivalence,
  RetailerIdentity,
} from '../../catalog/src/schema.js';
import { resolveProduct } from './resolve.js';
import { sameSize, sizeAdjustedSavingsCents } from './unit-price.js';
import type {
  ComparisonOutcome,
  IdentityMatchMethod,
  ProductSummary,
  ProductView,
  ShowOutcome,
  StoreContext,
} from './types.js';

function offerMatchesIdentity(offer: Offer, identity: RetailerIdentity): boolean {
  if (offer.retailer !== identity.retailer || offer.productId !== identity.productId) return false;
  try {
    return identity.canonicalUrlPatterns.some((pattern) => new RegExp(pattern).test(offer.url));
  } catch {
    return false;
  }
}

/** An in-stock, positive, unexpired USD offer for `product` at exactly this store and context. */
function eligibleOffer(
  offer: Offer,
  product: Product,
  store: StoreContext,
  nowMs: number,
): boolean {
  const identity = product.identities.find((candidate) => candidate.retailer === offer.retailer);
  if (!identity || !offerMatchesIdentity(offer, identity)) return false;
  if (
    offer.condition !== 'new' ||
    offer.availability !== 'in-stock' ||
    offer.price.currency !== 'USD' ||
    !Number.isSafeInteger(offer.price.amountCents) ||
    offer.price.amountCents <= 0 ||
    offer.priceContext !== store.priceContext ||
    offer.locationId !== store.locationId
  ) {
    return false;
  }
  const observedAt = Date.parse(offer.observedAt);
  const expiresAt = Date.parse(offer.expiresAt);
  if (!Number.isFinite(observedAt) || !Number.isFinite(expiresAt) || observedAt >= expiresAt) {
    return false;
  }
  return expiresAt > nowMs;
}

/**
 * The lowest eligible offer for a product. Taking the lowest for both sides of
 * a comparison can only understate savings, never overstate them.
 */
function lowestOffer(
  offers: Offer[],
  product: Product,
  store: StoreContext,
  nowMs: number,
): Offer | undefined {
  return offers
    .filter((offer) => eligibleOffer(offer, product, store, nowMs))
    .sort((left, right) => left.price.amountCents - right.price.amountCents)[0];
}

function summary(product: Product): ProductSummary {
  const { id, name, brand, variant, size, category, marketedTo } = product;
  return { id, name, ...(brand ? { brand } : {}), variant, size, category, marketedTo };
}

export type Equivalent = { equivalence: ProductEquivalence; product: Product };

/**
 * The active men's or neutral equivalents of an active women's product.
 * Comparisons only run in that direction, so any other product has none.
 */
export function equivalentsFor(catalog: Catalog, productId: string): Equivalent[] {
  const byId = new Map(catalog.products.map((product) => [product.id, product]));
  const self = byId.get(productId);
  if (!self || self.status !== 'active' || self.marketedTo !== 'women') return [];
  return catalog.equivalences.flatMap((equivalence) => {
    if (equivalence.status !== 'active') return [];
    const [left, right] = equivalence.productIds;
    const otherId = left === productId ? right : right === productId ? left : undefined;
    if (!otherId || otherId === productId) return [];
    const other = byId.get(otherId);
    if (!other || other.status !== 'active' || other.marketedTo === 'women') return [];
    if (other.category !== self.category) return [];
    if (other.size.unit !== self.size.unit) return [];
    return [{ equivalence, product: other }];
  });
}

/** Savings for the women's product's amount; see unit-price.ts. */
function savingsFor(
  product: Product,
  current: Offer,
  alternativeProduct: Product,
  alternative: Offer,
): number | undefined {
  return sizeAdjustedSavingsCents(
    current.price.amountCents,
    product.size,
    alternative.price.amountCents,
    alternativeProduct.size,
  );
}

function show(
  product: Product,
  current: Offer,
  equivalent: Equivalent,
  alternative: Offer,
  matchedBy?: IdentityMatchMethod,
): ShowOutcome {
  const { equivalence } = equivalent;
  return {
    status: 'show',
    equivalenceId: equivalence.id,
    product: summary(product),
    current,
    alternativeProduct: summary(equivalent.product),
    alternative,
    savings: {
      amountCents: savingsFor(product, current, equivalent.product, alternative) ?? 0,
      currency: 'USD',
    },
    basis: sameSize(product.size, equivalent.product.size) ? 'same-size' : 'per-unit',
    rationale: equivalence.rationale,
    matchedAttributes: [...equivalence.matchedAttributes],
    knownDifferences: [...equivalence.knownDifferences],
    ...(matchedBy ? { matchedBy } : {}),
  };
}

/**
 * Picks the cheapest reviewed equivalent priced below `current` at the same
 * store and context. Zero or negative savings is `no-match`.
 */
function bestAlternative(
  catalog: Catalog,
  product: Product,
  current: Offer,
  offers: Offer[],
  store: StoreContext,
  nowMs: number,
  matchedBy?: IdentityMatchMethod,
): ComparisonOutcome {
  const equivalents = equivalentsFor(catalog, product.id);
  if (equivalents.length === 0) return { status: 'no-match', reason: 'no-equivalent' };
  const candidates = equivalents
    .map((equivalent) => ({
      equivalent,
      offer: lowestOffer(offers, equivalent.product, store, nowMs),
    }))
    .flatMap((candidate) => {
      if (!candidate.offer) return [];
      const savings = savingsFor(product, current, candidate.equivalent.product, candidate.offer);
      return savings === undefined ? [] : [{ ...candidate, offer: candidate.offer, savings }];
    })
    .sort(
      (left, right) =>
        right.savings - left.savings ||
        left.equivalent.equivalence.id.localeCompare(right.equivalent.equivalence.id),
    );
  const best = candidates[0];
  if (!best) return { status: 'no-match', reason: 'no-eligible-offer' };
  if (best.savings <= 0) {
    return { status: 'no-match', reason: 'no-positive-savings' };
  }
  return show(product, current, best.equivalent, best.offer, matchedBy);
}

/**
 * Compares the product on the shopper's page with its reviewed equivalents
 * (REQUIREMENTS §5). `offers` must hold provider offers for the current
 * product and its equivalents; the page's own price is never used to compute
 * savings, only to detect a stale page or a different store, which suppresses.
 */
export function compareOffers(
  catalog: Catalog,
  view: ProductView,
  offers: Offer[],
  now = new Date(),
): ComparisonOutcome {
  const resolution = resolveProduct(catalog.products, view);
  if (resolution.status === 'no-match') return { status: 'no-match', reason: 'unknown-product' };
  if (resolution.status === 'conflict') return { status: 'suppressed', reason: resolution.kind };

  const pagePriceCents = view.currentPriceCents;
  if (
    typeof pagePriceCents !== 'number' ||
    !Number.isSafeInteger(pagePriceCents) ||
    pagePriceCents <= 0
  ) {
    return { status: 'suppressed', reason: 'invalid-current-price' };
  }
  if (view.currency !== 'USD') return { status: 'suppressed', reason: 'invalid-currency' };
  if (view.availability !== 'in-stock')
    return { status: 'suppressed', reason: 'current-unavailable' };
  if (!view.priceContext) return { status: 'suppressed', reason: 'missing-price-context' };
  if (view.priceContext === 'online') {
    return { status: 'suppressed', reason: 'unsupported-price-context' };
  }
  if (!view.locationId) return { status: 'suppressed', reason: 'missing-location' };
  if (equivalentsFor(catalog, resolution.product.id).length === 0) {
    return { status: 'no-match', reason: 'no-equivalent' };
  }

  const store: StoreContext = { locationId: view.locationId, priceContext: view.priceContext };
  const nowMs = now.valueOf();
  const current = lowestOffer(offers, resolution.product, store, nowMs);
  if (!current) return { status: 'suppressed', reason: 'current-offer-unavailable' };
  if (current.price.amountCents !== pagePriceCents) {
    return { status: 'suppressed', reason: 'page-price-mismatch' };
  }
  return bestAlternative(
    catalog,
    resolution.product,
    current,
    offers,
    store,
    nowMs,
    resolution.matchedBy,
  );
}

/**
 * Every active pair where the men's or neutral product costs less than the
 * women's product at one store, for the Marketplace list (REQUIREMENTS §3).
 * Pairs where either side can't be priced, or the women's product is not
 * pricier, are omitted.
 */
export function listComparisons(
  catalog: Catalog,
  offers: Offer[],
  store: StoreContext,
  now = new Date(),
): ShowOutcome[] {
  if (store.priceContext === 'online') return [];
  const nowMs = now.valueOf();
  const byId = new Map(catalog.products.map((product) => [product.id, product]));
  return catalog.equivalences.flatMap((equivalence) => {
    const womens = equivalence.productIds
      .map((id) => byId.get(id))
      .find((product) => product?.marketedTo === 'women');
    if (!womens) return [];
    const current = lowestOffer(offers, womens, store, nowMs);
    if (!current) return [];
    const outcome = bestAlternative(
      { products: catalog.products, equivalences: [equivalence] },
      womens,
      current,
      offers,
      store,
      nowMs,
    );
    return outcome.status === 'show' ? [outcome] : [];
  });
}
