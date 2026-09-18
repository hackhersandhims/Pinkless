import { cvsAdapter } from './cvs.js';
import { krogerAdapter } from './kroger.js';
import type { RetailerAdapter } from './types.js';
import { walmartAdapter } from './walmart.js';

export const retailerAdapters: readonly RetailerAdapter[] = [
  cvsAdapter,
  krogerAdapter,
  walmartAdapter,
];

export function adapterForUrl(url: URL): RetailerAdapter | undefined {
  return retailerAdapters.find((adapter) => adapter.canHandle(url));
}

export { cvsAdapter } from './cvs.js';
export { krogerAdapter } from './kroger.js';
export type { PageLocation, ProductView, RetailerAdapter } from './types.js';
export { walmartAdapter } from './walmart.js';
