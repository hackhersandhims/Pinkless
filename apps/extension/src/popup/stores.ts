import { PINKLESS_API_BASE_URL, RETAILERS, type Retailer } from '../shared/config.js';
import type { RetailerLocation } from '../shared/types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maxLength = 300): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function parseLocation(value: unknown, retailer: Retailer): RetailerLocation | null {
  if (
    !isRecord(value) ||
    value.retailer !== retailer ||
    !isString(value.locationId, 128) ||
    !isString(value.name) ||
    !isRecord(value.address) ||
    !isString(value.address.line1) ||
    !isString(value.address.city) ||
    !isString(value.address.state, 32) ||
    !isString(value.address.postalCode, 10)
  ) {
    return null;
  }
  return value as unknown as RetailerLocation;
}

export async function lookupStores(
  retailer: Retailer,
  postalCode: string,
): Promise<RetailerLocation[] | null> {
  if (!RETAILERS.includes(retailer) || !/^\d{5}(?:-\d{4})?$/.test(postalCode)) return null;
  try {
    const url = new URL('/api/stores', PINKLESS_API_BASE_URL);
    url.searchParams.set('retailer', retailer);
    url.searchParams.set('postalCode', postalCode);
    const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) return null;
    const payload = (await response.json()) as unknown;
    if (!isRecord(payload) || payload.status !== 'ok' || !Array.isArray(payload.locations)) {
      return null;
    }
    const locations = payload.locations.map((value) => parseLocation(value, retailer));
    return locations.every((location) => location !== null)
      ? (locations as RetailerLocation[])
      : null;
  } catch {
    return null;
  }
}
