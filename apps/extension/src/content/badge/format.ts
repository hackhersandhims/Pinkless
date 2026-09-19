import type { MarketedTo } from '../../../../../packages/catalog/src/schema.js';
import type { StorePriceContext } from '../../shared/types.js';

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
  timeZone: 'UTC',
});

/**
 * "Sep 19". `iso` must already be a valid date-time. UTC, like the Marketplace, so the day shown
 * does not depend on the viewer's time zone.
 */
export function formatCheckedDay(iso: string): string {
  return CHECKED_FORMATTER.format(new Date(iso));
}

/** Label for the equivalent's line. Only men's and neutral products are ever alternatives. */
export const ALTERNATIVE_LABELS: Partial<Record<MarketedTo, string>> = {
  men: "Men's version",
  neutral: 'Neutral version',
};

/** Store-specific prices are never described as online prices (REQUIREMENTS §7). */
export const PRICE_CONTEXT_LABELS: Record<StorePriceContext, string> = {
  'store-pickup': 'store pickup price',
  'in-store': 'in-store price',
};

/** Ends a catalog sentence with a period so sentences can be joined. */
export function asSentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
