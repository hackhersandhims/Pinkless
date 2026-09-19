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

/** "$2.00 less". `cents` must be a strictly positive integer savings amount. */
export function formatLess(cents: number): string {
  assertIntegerCents(cents, 'formatLess');
  return `${formatCents(cents)} less`;
}

/**
 * Whole-number percent the alternative is below the reference price, from
 * integer cents. Returns undefined when the reference price is not positive
 * or the difference rounds to under 1%, so callers show nothing rather than
 * "0% lower". A display ratio only: no price is ever computed from it.
 */
export function percentLower(savingsCents: number, referenceCents: number): number | undefined {
  assertIntegerCents(savingsCents, 'percentLower');
  assertIntegerCents(referenceCents, 'percentLower');
  if (referenceCents <= 0 || savingsCents <= 0) return undefined;
  const percent = Math.round((savingsCents * 100) / referenceCents);
  return percent >= 1 ? percent : undefined;
}

const UNIT_LABELS: Record<Size['unit'], string> = {
  oz: 'oz',
  ml: 'ml',
  count: 'ct',
};

/** "2.6 oz" / "4 ct". */
export function formatSize(size: Size): string {
  return `${size.amount} ${UNIT_LABELS[size.unit]}`;
}

/**
 * "$2.25 / ct" style per-unit price, for display only. Rounds to the nearest
 * cent; savings never come from this, they come from the matcher's integer math.
 */
export function formatPerUnit(amountCents: number, size: Size): string {
  assertIntegerCents(amountCents, 'formatPerUnit');
  const hundredths = Math.round(size.amount * 100);
  if (!(hundredths > 0)) {
    throw new Error(`formatPerUnit requires a positive size amount; received ${size.amount}.`);
  }
  return `${formatCents(Math.round((amountCents * 100) / hundredths))} / ${UNIT_LABELS[size.unit]}`;
}
