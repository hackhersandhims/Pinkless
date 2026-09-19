/**
 * The Marketplace's data-loading seam. REQUIREMENTS §3: the Marketplace calls
 * the same read-only API as the extension and never fetches retailer prices
 * itself.
 *
 * Requests go to `${VITE_PINKLESS_API_URL}/api/…`, or same-origin when that is
 * unset (in `vite dev`, dev-api.ts serves the repo-root `api/` functions with
 * live Kroger data). Any failure throws; the UI shows its error state and never
 * substitutes fixture prices.
 */

import type { ComparisonsResponse, StoreLocation } from './types.js';

const STORE_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;
const POSTAL_CODE_PATTERN = /^\d{5}$/;

function apiBase(): string {
  return (import.meta.env.VITE_PINKLESS_API_URL ?? '').replace(/\/+$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${apiBase()}${path}`, {
    headers: { accept: 'application/json' },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`Pinkless API returned ${response.status} for ${path.split('?')[0]}.`);
  }
  return response.json();
}

/** True for a Kroger location ID the API accepts. */
export function isValidStoreId(value: string): boolean {
  return STORE_ID_PATTERN.test(value);
}

/** True for a five-digit US ZIP code. */
export function isValidPostalCode(value: string): boolean {
  return POSTAL_CODE_PATTERN.test(value);
}
}

/**
 * Every reviewed pair where the men's or neutral product costs less than the
 * women's product at this Kroger store, in-store prices.
 */
export async function loadComparisons(
  locationId: string,
  signal?: AbortSignal,
): Promise<ComparisonsResponse> {
  if (!isValidStoreId(locationId)) throw new Error('Invalid Kroger store ID.');
  const query = new URLSearchParams({ locationId, priceContext: 'in-store' });
  const body = await getJson(`/api/comparisons?${query}`, signal);
  if (
    !isRecord(body) ||
    body.status !== 'ok' ||
    !Array.isArray(body.comparisons) ||
    typeof body.generatedAt !== 'string'
  ) {
    throw new Error('Pinkless API returned an unexpected comparisons body.');
  }
  return body as ComparisonsResponse;
}

function isStoreLocation(value: unknown): value is StoreLocation {
  if (!isRecord(value) || !isRecord(value.address)) return false;
  return (
    value.retailer === 'kroger' &&
    typeof value.locationId === 'string' &&
    isValidStoreId(value.locationId) &&
    typeof value.name === 'string' &&
    typeof value.address.line1 === 'string' &&
    typeof value.address.city === 'string' &&
    typeof value.address.state === 'string' &&
    typeof value.address.postalCode === 'string'
  );
}

/** Kroger stores near a US ZIP code. Malformed entries are dropped. */
export async function loadStores(postalCode: string, signal?: AbortSignal): Promise<StoreLocation[]> {
  if (!isValidPostalCode(postalCode)) throw new Error('Invalid ZIP code.');
  const query = new URLSearchParams({ postalCode });
  const body = await getJson(`/api/stores?${query}`, signal);
  if (!isRecord(body) || body.status !== 'ok' || !Array.isArray(body.locations)) {
    throw new Error('Pinkless API returned an unexpected stores body.');
  }
  return body.locations.filter(isStoreLocation);
}
