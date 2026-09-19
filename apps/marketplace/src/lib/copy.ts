/** Shared, factual comparison copy. Never says why prices differ. */

import { storeLabel } from './catalog.js';
import { formatObservedAt } from './dates.js';
import { formatCents } from './money.js';
import type { ComparisonView } from './types.js';

/** "The men’s version costs $0.80 less". */
export function comparisonHeadline(item: ComparisonView): string {
  return `The ${item.versionLabel} costs ${formatCents(item.savingsCents)} less`;
}

/** "Kroger On the Rhine · In store · Checked Sep 19, 2026". */
export function freshnessLine(item: ComparisonView): string {
  return `${storeLabel(item.store)} · ${item.priceContextLabel} · ${formatObservedAt(item.observedAt)}`;
}

/**
 * A one-sentence accessible name for a link that stands for a whole
 * comparison: both products, both prices, the store, and the date.
 */
export function comparisonSummary(item: ComparisonView): string {
  return (
    `${comparisonHeadline(item)}: ${item.womens.name}, ${formatCents(item.womens.priceCents)}, ` +
    `versus ${item.other.name}, ${formatCents(item.other.priceCents)}. ${freshnessLine(item)}.`
  );
}
