import type { ProductView } from '../shared/types.js';
import { amazonAdapter } from './amazon.js';
import { cvsAdapter } from './cvs.js';
import { cvsDemoAdapter, krogerDemoAdapter, walmartDemoAdapter } from './demo.js';
import { krogerAdapter } from './kroger.js';
import type { RetailerAdapter } from './types.js';
import { walmartAdapter } from './walmart.js';

export const retailerAdapters: readonly RetailerAdapter[] = [
  amazonAdapter,
  cvsAdapter,
  krogerAdapter,
  walmartAdapter,
  cvsDemoAdapter,
  krogerDemoAdapter,
  walmartDemoAdapter,
];

/** Explicit retailer and controlled-demo adapters enabled in the content script. */
export const ADAPTERS: readonly RetailerAdapter[] = retailerAdapters;

export function adapterForUrl(url: URL): RetailerAdapter | undefined {
  return retailerAdapters.find((adapter) => adapter.canHandle(url));
}

export function extractProductView(
  adapters: readonly RetailerAdapter[],
  doc: Document,
  loc: Location,
): ProductView | null {
  const url = new URL(loc.href);
  const adapter = adapters.find((candidate) => candidate.canHandle(url));
  return adapter ? adapter.extract(doc, loc) : null;
}
export { amazonAdapter } from './amazon.js';
export { cvsAdapter } from './cvs.js';
export { cvsDemoAdapter, krogerDemoAdapter, walmartDemoAdapter } from './demo.js';
export { krogerAdapter } from './kroger.js';
export type { PageLocation, ProductView, RetailerAdapter } from './types.js';
export { walmartAdapter } from './walmart.js';
