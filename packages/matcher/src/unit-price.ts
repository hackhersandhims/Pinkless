import type { Size } from '../../catalog/src/schema.js';

/** Size amounts in hundredths, so 2.6 oz becomes 260; sizes finer than that are rejected. */
function hundredths(amount: number): number | undefined {
  const scaled = Math.round(amount * 100);
  return scaled > 0 && Math.abs(scaled - amount * 100) < 1e-6 ? scaled : undefined;
}

/**
 * What `alternative` costs for exactly `current`'s amount, at the alternative's
 * own unit price, in integer cents. Rounds up, so it can only understate the
 * savings. Undefined for different units or unusable sizes.
 */
export function alternativeCentsForCurrentSize(
  alternativeCents: number,
  alternativeSize: Size,
  currentSize: Size,
): number | undefined {
  if (alternativeSize.unit !== currentSize.unit) return undefined;
  const alt = hundredths(alternativeSize.amount);
  const cur = hundredths(currentSize.amount);
  if (alt === undefined || cur === undefined || !Number.isSafeInteger(alternativeCents)) {
    return undefined;
  }
  if (alt === cur) return alternativeCents;
  return Math.ceil((alternativeCents * cur) / alt);
}

/**
 * Savings for the same amount: current price minus the alternative priced at
 * current's size. Equal sizes reduce to a plain price difference.
 */
export function sizeAdjustedSavingsCents(
  currentCents: number,
  currentSize: Size,
  alternativeCents: number,
  alternativeSize: Size,
): number | undefined {
  const scaled = alternativeCentsForCurrentSize(alternativeCents, alternativeSize, currentSize);
  return scaled === undefined ? undefined : currentCents - scaled;
}

export function sameSize(left: Size, right: Size): boolean {
  return left.unit === right.unit && left.amount === right.amount;
}
