export const RETAILERS = ['cvs', 'kroger', 'walmart'] as const;
export type Retailer = (typeof RETAILERS)[number];

export const RETAILER_LABELS: Record<Retailer, string> = {
  cvs: 'CVS',
  kroger: 'Kroger',
  walmart: 'Walmart',
};

/**
 * The controlled Phase 5 fallback is intentionally limited to this local
 * development origin and to explicit product routes. It is not a general
 * localhost permission and it never enables collection from arbitrary pages.
 */
export const CONTROLLED_DEMO_ORIGINS = ['http://localhost:4174'] as const;

export function demoRetailerForUrl(url: URL): Retailer | undefined {
  if (
    url.username ||
    url.password ||
    !CONTROLLED_DEMO_ORIGINS.includes(url.origin as (typeof CONTROLLED_DEMO_ORIGINS)[number])
  ) {
    return undefined;
  }
  const match = url.pathname.match(/^\/product\/(cvs|kroger|walmart)\/?$/);
  return match?.[1] as Retailer | undefined;
}

// Phase 7 replaces these local origins when the Vercel projects exist.
export const PINKLESS_API_BASE_URL = 'http://localhost:3000';
export const PINKLESS_MARKETPLACE_URL = 'http://localhost:5173';
