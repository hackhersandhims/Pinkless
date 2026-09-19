import { RETAILER } from './config.js';
import type { StoreLocation } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maxLength = 300): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

/** Validates every field returned by the Pinkless locations endpoint. */
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
