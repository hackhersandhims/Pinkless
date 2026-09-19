import type { SelectedStore } from '../shared/settings.js';
import type { ProductView } from '../shared/types.js';
import { krogerDemoAdapter } from './demo.js';
import { krogerAdapter } from './kroger.js';
import type { PageLocation, RetailerAdapter } from './types.js';

export type { PageLocation, RetailerAdapter } from './types.js';

/** Kroger product pages, plus the path-locked local fallback page. */
export const ADAPTERS: readonly RetailerAdapter[] = [krogerAdapter, krogerDemoAdapter];

export function adapterForUrl(
  url: URL,
  adapters: readonly RetailerAdapter[] = ADAPTERS,
): RetailerAdapter | undefined {
  return adapters.find((candidate) => candidate.canHandle(url));
}

export function extractProductView(
  adapters: readonly RetailerAdapter[],
  doc: Document,
  loc: PageLocation,
  store?: SelectedStore,
): ProductView | null {
  let url: URL;
  try {
    url = new URL(loc.href);
  } catch {
    return null;
  }
  const adapter = adapterForUrl(url, adapters);
  return adapter ? adapter.extract(doc, loc, store) : null;
}
