import type { StorePriceContext } from './types.js';

/** Kroger is the only supported retailer (REQUIREMENTS §1–§3). */
export const RETAILER = 'kroger' as const;
export const RETAILER_LABEL = 'Kroger';
export const RETAILER_DOMAIN = 'kroger.com';

/** Hosts where the content script may ask for a comparison. Mirrors manifest `matches`. */
export const RETAILER_HOSTS = ['www.kroger.com'] as const;

/**
 * Both products are priced at the selected store's shelf price. The API accepts only store
 * contexts (`in-store` | `store-pickup`); the page price is a consistency check, never savings.
 */
export const STORE_PRICE_CONTEXT: StorePriceContext = 'in-store';

/**
 * The controlled fallback page is limited to this local development origin and one explicit
 * product route. It is not a general localhost permission.
 */
export const CONTROLLED_DEMO_ORIGINS = ['http://localhost:4174'] as const;
export const CONTROLLED_DEMO_PATH = /^\/product\/kroger\/?$/;

export function isControlledDemoUrl(url: URL): boolean {
  return (
    !url.username &&
    !url.password &&
    CONTROLLED_DEMO_ORIGINS.includes(url.origin as (typeof CONTROLLED_DEMO_ORIGINS)[number]) &&
    CONTROLLED_DEMO_PATH.test(url.pathname)
  );
}

// Phase 7 replaces these local origins when the Vercel projects exist.
export const PINKLESS_API_BASE_URL = 'http://localhost:3000';
export const PINKLESS_MARKETPLACE_URL = 'http://localhost:5173';
