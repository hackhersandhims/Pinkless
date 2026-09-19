export const RETAILERS = ['cvs', 'kroger', 'walmart'] as const;
export type Retailer = (typeof RETAILERS)[number];

export const RETAILER_LABELS: Record<Retailer, string> = {
  cvs: 'CVS',
  kroger: 'Kroger',
  walmart: 'Walmart',
};

// Phase 7 replaces these local origins when the Vercel projects exist.
export const PINKLESS_API_BASE_URL = 'http://localhost:3000';
export const PINKLESS_MARKETPLACE_URL = 'http://localhost:5173';
