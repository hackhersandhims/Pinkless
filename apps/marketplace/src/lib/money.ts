/**
 * Money formatting helpers. REQUIREMENTS §4: all monetary amounts are integer
 * minor units (`amountCents`); floating-point values never cross this
 * boundary. Every formatter here rejects a non-integer input rather than
 * silently rounding it.
 */

import type { Size } from './types.js';

function assertIntegerCents(amountCents: number, fnName: string): void {
  if (!Number.isInteger(amountCents)) {
    throw new Error(
      `${fnName} requires an integer amount in minor units (cents); received ${amountCents}.`,
    );
  }
}

/** "$13.49". formatCents(5) -> "$0.05". */
export function formatCents(amountCents: number, currency: 'USD' = 'USD'): string {
  assertIntegerCents(amountCents, 'formatCents');
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountCents / 100);
}

/** "Save $2.00". `cents` must be a strictly positive integer savings amount. */
export function formatSavings(cents: number): string {
  assertIntegerCents(cents, 'formatSavings');
  return `Save ${formatCents(cents)}`;
}

const UNIT_LABELS: Record<Size['unit'], string> = {
  oz: 'oz',
  ml: 'ml',
  count: 'ct',
};

/**
 * "$2.25 / ct" style per-unit price display.
 *
 * REQUIREMENTS "Later expansion" defers price-per-unit comparisons to a
 * reviewed, category-specific normalization rule set. This helper is
 * exported for that future work only — DO NOT call it from any default
 * display path (comparison cards, detail views, etc.) today.
 */
export function formatPerUnit(amountCents: number, size: Size): string {
  assertIntegerCents(amountCents, 'formatPerUnit');
  if (!(size.amount > 0)) {
    throw new Error(`formatPerUnit requires a positive size amount; received ${size.amount}.`);
  }
  const perUnitDollars = amountCents / 100 / size.amount;
  return `$${perUnitDollars.toFixed(2)} / ${UNIT_LABELS[size.unit]}`;
}
