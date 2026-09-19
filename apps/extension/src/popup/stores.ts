import { PINKLESS_API_BASE_URL, RETAILER } from '../shared/config.js';
import type { StoreLocation } from '../shared/types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maxLength = 300): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export function parseStoreLocation(value: unknown): StoreLocation | null {
  if (
    !isRecord(value) ||
    value.retailer !== RETAILER ||
    !isString(value.locationId, 128) ||
    !/^[A-Za-z0-9-]+$/.test(value.locationId) ||
    !isString(value.name) ||
    !isRecord(value.address) ||
    !isString(value.address.line1) ||
    !isString(value.address.city) ||
    !isString(value.address.state, 32) ||
    !isString(value.address.postalCode, 10)
  ) {
    return null;
  }
  return value as unknown as StoreLocation;
}

/**
 * `GET /api/stores?postalCode=` — Kroger stores near a US ZIP code. Returns null when the lookup
 * is unavailable or the response is malformed (all-or-nothing: no partial store list).
 */
export async function lookupStores(
  postalCode: string,
  fetcher: typeof fetch = fetch,
): Promise<StoreLocation[] | null> {
  if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) return null;
  try {
    const url = new URL('/api/stores', PINKLESS_API_BASE_URL);
    url.searchParams.set('postalCode', postalCode);
    const response = await fetcher(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) return null;
    const payload = (await response.json()) as unknown;
    if (!isRecord(payload) || payload.status !== 'ok' || !Array.isArray(payload.locations)) {
      return null;
    }
    const locations = payload.locations.map(parseStoreLocation);
    return locations.every((location) => location !== null) ? (locations as StoreLocation[]) : null;
  } catch {
    return null;
  }
}
