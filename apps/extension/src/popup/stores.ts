import {
  PINKLESS_API_BASE_URL,
  PINKLESS_EXTENSION_ORIGIN_HEADER,
  runtimeExtensionOrigin,
} from '../shared/config.js';
import { parseStoreLocation } from '../shared/stores.js';
import type { StoreLocation } from '../shared/types.js';
export { parseStoreLocation } from '../shared/stores.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `GET /api/stores?postalCode=` — Kroger stores near a US ZIP code. Returns null when the lookup
 * is unavailable or the response is malformed (all-or-nothing: no partial store list).
 */
export async function lookupStores(
  postalCode: string,
  fetcher: typeof fetch = fetch,
  extensionOrigin = runtimeExtensionOrigin(),
): Promise<StoreLocation[] | null> {
  if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) return null;
  try {
    const url = new URL('/api/stores', PINKLESS_API_BASE_URL);
    url.searchParams.set('postalCode', postalCode);
    const response = await fetcher(url, {
      ...(extensionOrigin
        ? { headers: { [PINKLESS_EXTENSION_ORIGIN_HEADER]: extensionOrigin } }
        : {}),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
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
