import type { ComparisonOutcome, ProductView } from '../shared/types.js';

/**
 * Not implemented yet (TASKS.md Phase 4), and fail-closed until it is: every request is
 * answered with a suppressed outcome, so nothing renders.
 *
 * The real version cannot `fetch` from here. A content script's requests carry the RETAILER
 * page's Origin, and the API only accepts its configured allowlist (`PINKLESS_ALLOWED_ORIGINS`:
 * the Marketplace and the `chrome-extension://` origin). It has to be a message to a background
 * service worker, which calls `POST /api/compare` with the extension's origin and needs the API
 * origin in `host_permissions`. That also needs a decision on where the API base URL comes from.
 */
export async function requestComparison(_view: ProductView): Promise<ComparisonOutcome> {
  return { status: 'suppressed', reason: 'provider-unavailable' };
}
