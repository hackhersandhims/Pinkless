import type { ComparisonOutcome, Retailer } from '../../shared/types.js';
import {
  MATCH_METHOD_LABELS,
  PRICE_CONTEXT_LABELS,
  RETAILER_LABELS,
  formatCents,
  formatChecked,
} from './format.js';

/** What the badge shows, already formatted. The view renders these strings verbatim. */
export type BadgeModel = {
  headline: string;
  rationale: string;
  offerLine: string;
  action: { href: string; ariaLabel: string };
  details: ReadonlyArray<{ term: string; description: string }>;
  /** Epoch ms after which the offer is stale and the badge must go away. */
  expiresAtMs: number;
};

const RETAILER_DOMAINS: Record<Retailer, string> = {
  amazon: 'amazon.com',
  cvs: 'cvs.com',
  kroger: 'kroger.com',
  walmart: 'walmart.com',
};

/**
 * The outbound link comes from the API, i.e. data we do not control on a page we do not control.
 * Only an https URL on the alternative retailer's own domain becomes an `href`.
 */
export function safeOutboundUrl(url: unknown, retailer: Retailer): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    const domain = RETAILER_DOMAINS[retailer];
    const onDomain = parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
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

/**
 * Turns an API outcome into badge content, or `null` for "render nothing".
 *
 * The matcher/API already decided eligibility. This is the last, cheap line of defence at the
 * trust boundary: anything that does not add up exactly is silence, never a best guess
 * (suppress-by-default). In particular the savings shown must equal current − alternative in
 * integer cents, and the offer must still be unexpired at render time.
 */
export function toBadgeModel(
  outcome: ComparisonOutcome,
  now: Date = new Date(),
): BadgeModel | null {
  try {
    if (outcome.status !== 'show') return null;
    const { product, alternativeProduct, current, alternative, savings, rationale, matchedBy } =
      outcome;

    if (typeof rationale !== 'string' || rationale.trim() === '') return null;
    if (!isPositiveCents(current.price.amountCents) || current.price.currency !== 'USD')
      return null;
    if (!isPositiveCents(alternative.price.amountCents) || alternative.price.currency !== 'USD') {
      return null;
    }
    if (!isPositiveCents(savings.amountCents) || savings.currency !== 'USD') return null;
    if (savings.amountCents !== current.price.amountCents - alternative.price.amountCents) {
      return null;
    }
    if (alternative.availability !== 'in-stock' || alternative.condition !== 'new') return null;
    if (alternative.priceContext !== current.priceContext) return null;
    if (product.audience !== 'women' || alternativeProduct.audience !== 'men') return null;
    if (alternative.retailer !== current.retailer) return null;
    if (
      current.priceContext !== 'online' &&
      (!current.locationId || alternative.locationId !== current.locationId)
    ) {
      return null;
    }

    const observedAtMs = Date.parse(alternative.observedAt);
    const expiresAtMs = Date.parse(alternative.expiresAt);
    if (!Number.isFinite(observedAtMs) || !Number.isFinite(expiresAtMs)) return null;
    if (expiresAtMs <= now.valueOf()) return null;

    const href = safeOutboundUrl(alternative.url, alternative.retailer);
    const matchLabel = MATCH_METHOD_LABELS[matchedBy];
    const contextLabel = PRICE_CONTEXT_LABELS[current.priceContext];
    const retailer = RETAILER_LABELS[current.retailer];
    if (!href || !matchLabel || !contextLabel || !retailer) {
      return null;
    }

    const alternativePrice = formatCents(alternative.price.amountCents);
    const currentProductName = [product.brand, product.name].filter(Boolean).join(' ');
    const alternativeProductName = [alternativeProduct.brand, alternativeProduct.name]
      .filter(Boolean)
      .join(' ');

    return {
      headline: `Men's alternative: save ${formatCents(savings.amountCents)}`,
      rationale,
      offerLine: `${alternativeProduct.name} · ${alternativePrice} at ${retailer} · ${formatChecked(alternative.observedAt)}`,
      action: {
        href,
        ariaLabel: `See men's alternative: ${alternativeProduct.name}, ${alternativePrice} at ${retailer} (opens in a new tab)`,
      },
      details: [
        {
          term: "Women's product",
          description: `${currentProductName}, ${product.variant}`,
        },
        {
          term: "Men's alternative",
          description: `${alternativeProductName}, ${alternativeProduct.variant}`,
        },
        {
          term: 'This page',
          description: `${formatCents(current.price.amountCents)} at ${retailer}, ${contextLabel}`,
        },
        {
          term: 'Alternative',
          description: `${alternativePrice} at ${retailer}, ${contextLabel}`,
        },
        {
          term: 'Difference',
          description: `${formatCents(savings.amountCents)} less at ${retailer}`,
        },
        { term: 'Matched by', description: matchLabel },
      ],
      expiresAtMs,
    };
  } catch {
    // Malformed API payload (missing nested field, wrong type): silence, not an error surface.
    return null;
  }
}
