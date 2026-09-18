import type { Offer, Product, RetailerIdentity } from '../../catalog/src/schema.js';
import { resolveProduct } from './resolve.js';
import type { ComparisonOutcome, ProductView, RetailerLocationSelection } from './types.js';

function offerMatchesIdentity(offer: Offer, identity: RetailerIdentity): boolean {
  if (offer.retailer !== identity.retailer || offer.productId !== identity.productId) return false;
  try {
    return identity.canonicalUrlPatterns.some((pattern) => new RegExp(pattern).test(offer.url));
  } catch {
    return false;
  }
}

function eligibleOffer(
  offer: Offer,
  product: Product,
  current: ProductView,
  nowMs: number,
  locations: RetailerLocationSelection,
): boolean {
  const identity = product.identities.find((candidate) => candidate.retailer === offer.retailer);
  if (!identity || offer.retailer === current.retailer || !offerMatchesIdentity(offer, identity)) {
    return false;
  }
  if (
    offer.condition !== 'new' ||
    offer.availability !== 'in-stock' ||
    offer.price.currency !== 'USD' ||
    !Number.isSafeInteger(offer.price.amountCents) ||
    offer.price.amountCents <= 0 ||
    offer.priceContext !== current.priceContext
  ) {
    return false;
  }
  const observedAt = Date.parse(offer.observedAt);
  const expiresAt = Date.parse(offer.expiresAt);
  if (!Number.isFinite(observedAt) || !Number.isFinite(expiresAt) || observedAt >= expiresAt) {
    return false;
  }
  if (expiresAt <= nowMs) return false;
  if (current.priceContext !== 'online') {
    const expectedLocation = locations[offer.retailer] ?? current.locationId;
    if (!expectedLocation || offer.locationId !== expectedLocation) return false;
  }
  return true;
}

export function compareOffers(
  products: Product[],
  current: ProductView,
  offers: Offer[],
  now = new Date(),
  locations: RetailerLocationSelection = {},
): ComparisonOutcome {
  const resolution = resolveProduct(products, current);
  if (resolution.status === 'no-match') {
    return { status: 'no-match', reason: 'unknown-product' };
  }
  if (resolution.status === 'conflict') {
    return { status: 'suppressed', reason: resolution.kind };
  }
  const currentPriceCents = current.currentPriceCents;
  if (
    typeof currentPriceCents !== 'number' ||
    !Number.isSafeInteger(currentPriceCents) ||
    currentPriceCents <= 0
  ) {
    return { status: 'suppressed', reason: 'invalid-current-price' };
  }
  if (current.currency !== 'USD') {
    return { status: 'suppressed', reason: 'invalid-currency' };
  }
  if (current.availability !== 'in-stock') {
    return { status: 'suppressed', reason: 'current-unavailable' };
  }
  if (!current.priceContext) {
    return { status: 'suppressed', reason: 'missing-price-context' };
  }
  if (current.priceContext !== 'online' && !current.locationId) {
    return { status: 'suppressed', reason: 'missing-location' };
  }
  if (
    current.priceContext !== 'online' &&
    locations[current.retailer] &&
    locations[current.retailer] !== current.locationId
  ) {
    return { status: 'suppressed', reason: 'missing-location' };
  }

  const eligible = offers
    .filter((offer) => eligibleOffer(offer, resolution.product, current, now.valueOf(), locations))
    .sort(
      (left, right) =>
        left.price.amountCents - right.price.amountCents ||
        left.retailer.localeCompare(right.retailer),
    );
  if (eligible.length === 0) {
    return { status: 'no-match', reason: 'no-eligible-offer' };
  }
  const alternative = eligible[0]!;
  const savings = currentPriceCents - alternative.price.amountCents;
  if (savings <= 0) {
    return { status: 'no-match', reason: 'no-positive-savings' };
  }

  const { id, name, brand, variant, size } = resolution.product;
  return {
    status: 'show',
    product: { id, name, ...(brand ? { brand } : {}), variant, size },
    current: {
      retailer: current.retailer,
      price: { amountCents: currentPriceCents, currency: 'USD' },
      priceContext: current.priceContext,
      ...(current.locationId ? { locationId: current.locationId } : {}),
    },
    alternative,
    savings: { amountCents: savings, currency: 'USD' },
    rationale: resolution.product.equivalence.rationale,
    matchedBy: resolution.matchedBy,
  };
}
