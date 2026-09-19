import type { IdentityMatchMethod, PriceContext, Retailer } from '../../shared/types.js';

/**
 * Display formatting for the badge. Money is integer cents end to end (AGENTS.md §4): the
 * dollars/cents split below uses integer arithmetic only, so no floating-point value ever
 * represents a price. Output matches the Marketplace's `formatCents` ("$13.49", "$1,234.56").
 */

const DOLLARS_FORMATTER = new Intl.NumberFormat('en-US');

export function formatCents(amountCents: number): string {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new RangeError(`formatCents requires a non-negative integer; received ${amountCents}.`);
  }
  const cents = amountCents % 100;
  const dollars = (amountCents - cents) / 100;
  return `$${DOLLARS_FORMATTER.format(dollars)}.${String(cents).padStart(2, '0')}`;
}

const CHECKED_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "Checked Sep 18, 2026". `iso` must already be a valid date-time. */
export function formatChecked(iso: string): string {
  return `Checked ${CHECKED_FORMATTER.format(new Date(iso))}`;
}

export const RETAILER_LABELS: Record<Retailer, string> = {
  amazon: 'Amazon',
  cvs: 'CVS',
  kroger: 'Kroger',
  walmart: 'Walmart',
};

/** Store-specific prices are never described as online prices, or the reverse (REQUIREMENTS §7). */
export const PRICE_CONTEXT_LABELS: Record<PriceContext, string> = {
  online: 'online price',
  'store-pickup': 'store pickup price',
  'in-store': 'in-store price',
};

export const MATCH_METHOD_LABELS: Record<IdentityMatchMethod, string> = {
  upc: 'Exact UPC',
  'retailer-product-id': 'Retailer product ID',
  'canonical-url': 'Reviewed product page',
};
