import type { ProductView } from '../shared/types.js';
import type { RetailerAdapter } from './types.js';

export type { RetailerAdapter } from './types.js';

/**
 * Registered page adapters. Empty until the CVS, Kroger and Walmart adapters land (TASKS.md
 * Phase 3): with no adapter, no page produces a `ProductView` and the badge never renders.
 */
export const ADAPTERS: readonly RetailerAdapter[] = [];

export function extractProductView(
  adapters: readonly RetailerAdapter[],
  doc: Document,
  loc: Location,
): ProductView | null {
  const url = new URL(loc.href);
  const adapter = adapters.find((candidate) => candidate.canHandle(url));
  return adapter ? adapter.extract(doc, loc) : null;
}
