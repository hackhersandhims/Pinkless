import type {
  Offer,
  Product,
  RetailerIdentity,
  ReviewedAlternative,
} from '../../catalog/src/schema.js';
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
  identity: RetailerIdentity,
  current: ProductView,
  nowMs: number,
): boolean {
  if (offer.retailer !== current.retailer || !offerMatchesIdentity(offer, identity)) {
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
    if (!current.locationId || offer.locationId !== current.locationId) return false;
  }
  return true;
}

type AlternativeCandidate = {
  product: Product;
  relationship: ReviewedAlternative;
  identity: RetailerIdentity;
  offer: Offer;
};

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

  const candidateProducts = resolution.product.reviewedAlternatives.flatMap((relationship) => {
    const product = products.find(
      (candidate) => candidate.id === relationship.productId && candidate.status === 'active',
    );
    if (
      !product ||
      product.audience !== 'men' ||
      product.category !== resolution.product.category
    ) {
      return [];
    }
    const identity = product.identities.find(
      (candidate) => candidate.retailer === current.retailer,
    );
    return identity ? [{ product, relationship, identity }] : [];
  });
  const eligible: AlternativeCandidate[] = candidateProducts
    .flatMap((candidate) =>
      offers
        .filter((offer) => eligibleOffer(offer, candidate.identity, current, now.valueOf()))
        .map((offer) => ({ ...candidate, offer })),
    )
    .sort(
      (left, right) =>
        left.offer.price.amountCents - right.offer.price.amountCents ||
        left.product.id.localeCompare(right.product.id),
    );
  if (eligible.length === 0) {
    return { status: 'no-match', reason: 'no-eligible-offer' };
  }
  const selected = eligible[0]!;
  const savings = currentPriceCents - selected.offer.price.amountCents;
  if (savings <= 0) {
    return { status: 'no-match', reason: 'no-positive-savings' };
  }

  const { id, name, brand, variant, size, audience } = resolution.product;
  const alternativeProduct = selected.product;
  return {
    status: 'show',
    product: { id, name, ...(brand ? { brand } : {}), variant, size, audience },
    alternativeProduct: {
      id: alternativeProduct.id,
      name: alternativeProduct.name,
      ...(alternativeProduct.brand ? { brand: alternativeProduct.brand } : {}),
      variant: alternativeProduct.variant,
      size: alternativeProduct.size,
      audience: alternativeProduct.audience,
    },
    current: {
      retailer: current.retailer,
      price: { amountCents: currentPriceCents, currency: 'USD' },
      priceContext: current.priceContext,
      ...(current.locationId ? { locationId: current.locationId } : {}),
    },
    alternative: selected.offer,
    savings: { amountCents: savings, currency: 'USD' },
    rationale: selected.relationship.rationale,
    matchedAttributes: selected.relationship.matchedAttributes,
    ...(selected.relationship.knownDifferences
      ? { knownDifferences: selected.relationship.knownDifferences }
      : {}),
    matchedBy: resolution.matchedBy,
  };
}
