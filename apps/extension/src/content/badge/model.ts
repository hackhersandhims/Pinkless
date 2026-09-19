import { RETAILER, RETAILER_DOMAIN, RETAILER_LABEL } from '../../shared/config.js';
import type {
  ComparisonOutcome,
  Offer,
  ProductSummary,
  StorePriceContext,
} from '../../shared/types.js';
// Pure arithmetic only (no catalog or matching logic), shared so the badge's check can't drift.
import { sizeAdjustedSavingsCents } from '../../../../../packages/matcher/src/unit-price.js';
import {
  ALTERNATIVE_LABELS,
  PRICE_CONTEXT_LABELS,
  asSentence,
  formatCents,
  formatCheckedDay,
} from './format.js';

/** What the badge shows, already formatted. The view renders these strings verbatim. */
export type BadgeModel = {
  /** REQUIREMENTS §6: "Comparable alternative: save $X.XX". */
  headline: string;
  /** "Men's version: BIC Comfort 3 Advance Disposable Razors — $5.99". */
  productLine: string;
  /** Rationale, first known difference, store and checked date. */
  supporting: string;
  action: { href: string; ariaLabel: string };
  /** "Why this was matched": each term with one or more descriptions. */
  details: ReadonlyArray<{ term: string; descriptions: readonly string[] }>;
  /** Epoch ms after which either offer is stale and the badge must go away. */
  expiresAtMs: number;
};

const STORE_PHRASE = `your selected ${RETAILER_LABEL} store`;

/**
 * The outbound link comes from the API, i.e. data we do not control, rendered on a page we do not
 * control. Only an https URL on kroger.com becomes an `href`.
 */
export function safeOutboundUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    const onDomain =
      parsed.hostname === RETAILER_DOMAIN || parsed.hostname.endsWith(`.${RETAILER_DOMAIN}`);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !onDomain) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function isPositiveCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isText(value: unknown, maxLength = 1_000): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= maxLength;
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isText(item));
}

function isStoreContext(value: unknown): value is StorePriceContext {
  return value === 'in-store' || value === 'store-pickup';
}

/** A priced, purchasable offer at a Kroger store. */
function isEligibleOffer(offer: Offer): boolean {
  return (
    offer.retailer === RETAILER &&
    isText(offer.productId, 128) &&
    isPositiveCents(offer.price.amountCents) &&
    offer.price.currency === 'USD' &&
    offer.condition === 'new' &&
    offer.availability === 'in-stock' &&
    isStoreContext(offer.priceContext) &&
    isText(offer.locationId, 128)
  );
}

function displayName(product: ProductSummary): string {
  const name = product.name.trim();
  const brand = product.brand?.trim();
  return brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name;
}

function offerExpiry(offer: Offer): number | null {
  const observedAtMs = Date.parse(offer.observedAt);
  const expiresAtMs = Date.parse(offer.expiresAt);
  if (!Number.isFinite(observedAtMs) || !Number.isFinite(expiresAtMs)) return null;
  return observedAtMs < expiresAtMs ? expiresAtMs : null;
}

/**
 * Turns an API outcome into badge content, or `null` for "render nothing".
 *
 * The matcher/API already decided eligibility. This is the last, cheap line of defence at the
 * trust boundary: anything that does not add up exactly is silence, never a best guess
 * (suppress-by-default). The badge only ever appears on a women's product, for a reviewed men's
 * or neutral equivalent priced at the same Kroger store in the same price context, and the savings
 * shown must equal current − alternative in integer cents with both offers unexpired.
 *
 * Copy states facts only: it never says why the prices differ.
 */
export function toBadgeModel(
  outcome: ComparisonOutcome,
  now: Date = new Date(),
): BadgeModel | null {
  try {
    if (outcome.status !== 'show') return null;
    const {
      product,
      current,
      alternativeProduct,
      alternative,
      savings,
      rationale,
      matchedAttributes,
      knownDifferences,
    } = outcome;

    if (!isText(rationale) || !isTextList(matchedAttributes) || !isTextList(knownDifferences)) {
      return null;
    }
    if (product.marketedTo !== 'women') return null;
    const alternativeLabel = ALTERNATIVE_LABELS[alternativeProduct.marketedTo];
    if (!alternativeLabel || !isText(alternativeProduct.name, 500)) return null;
    if (product.id === alternativeProduct.id) return null;

    if (!isEligibleOffer(current) || !isEligibleOffer(alternative)) return null;
    if (current.productId === alternative.productId) return null;
    if (current.priceContext !== alternative.priceContext) return null;
    if (current.locationId !== alternative.locationId) return null;

    if (!isPositiveCents(savings.amountCents) || savings.currency !== 'USD') return null;
    const expectedSavings = sizeAdjustedSavingsCents(
      current.price.amountCents,
      product.size,
      alternative.price.amountCents,
      alternativeProduct.size,
    );
    if (savings.amountCents !== expectedSavings) return null;
    const sameAmount =
      product.size.unit === alternativeProduct.size.unit &&
      product.size.amount === alternativeProduct.size.amount;
    if (outcome.basis !== (sameAmount ? 'same-size' : 'per-unit')) return null;

    const currentExpiry = offerExpiry(current);
    const alternativeExpiry = offerExpiry(alternative);
    if (currentExpiry === null || alternativeExpiry === null) return null;
    const expiresAtMs = Math.min(currentExpiry, alternativeExpiry);
    if (expiresAtMs <= now.valueOf()) return null;

    const href = safeOutboundUrl(alternative.url);
    if (!href) return null;

    const alternativeName = displayName(alternativeProduct);
    const alternativePrice = formatCents(alternative.price.amountCents);
    const currentPrice = formatCents(current.price.amountCents);
    const checkedDay = formatCheckedDay(alternative.observedAt);
    const contextLabel = PRICE_CONTEXT_LABELS[current.priceContext as StorePriceContext];

    return {
      headline: sameAmount
        ? `Comparable alternative: save ${formatCents(savings.amountCents)}`
        : `Comparable alternative: save ${formatCents(savings.amountCents)} for the same amount`,
      productLine: sameAmount
        ? `${alternativeLabel}: ${alternativeName} — ${alternativePrice}`
        : `${alternativeLabel}: ${alternativeName} — ${alternativePrice} for ${formatSize(alternativeProduct.size)} (this one is ${formatSize(product.size)})`,
      supporting: [
        asSentence(rationale),
        `Differs: ${asSentence(knownDifferences[0]!)}`,
        `Prices at ${STORE_PHRASE}, checked ${checkedDay}.`,
      ].join(' '),
      action: {
        href,
        ariaLabel: `See alternative: ${alternativeName}, ${alternativePrice} at ${STORE_PHRASE} (opens in a new tab)`,
      },
      details: [
        { term: 'Matched on', descriptions: [matchedAttributes.join(', ')] },
        { term: 'Known differences', descriptions: knownDifferences.map(asSentence) },
        {
          term: 'Prices',
          descriptions: [
            `This product: ${currentPrice}`,
            `${alternativeLabel}: ${alternativePrice}`,
            `Both are the ${contextLabel} at ${STORE_PHRASE}, checked ${checkedDay}.`,
          ],
        },
      ],
      expiresAtMs,
    };
  } catch {
    // Malformed API payload (missing nested field, wrong type): silence, not an error surface.
    return null;
  }
}

function formatSize(size: ProductSummary['size']): string {
  return size.unit === 'count' ? `${size.amount} ct` : `${size.amount} ${size.unit}`;
}
