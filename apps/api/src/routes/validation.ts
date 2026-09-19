import {
  PRICE_CONTEXTS,
  RETAILERS,
  type PriceContext,
  type Retailer,
} from '../../../../packages/catalog/src/schema.js';
import type {
  ProductView,
  RetailerLocationSelection,
} from '../../../../packages/matcher/src/types.js';

const retailerDomains: Record<Retailer, string> = {
  amazon: 'amazon.com',
  cvs: 'cvs.com',
  kroger: 'kroger.com',
  walmart: 'walmart.com',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function validGtin(value: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  for (let index = digits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += digits[index]! * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

function validRetailerUrl(value: unknown, retailer: Retailer): value is string {
  if (!nonEmptyString(value, 2_048)) return false;
  try {
    const url = new URL(value);
    const domain = retailerDomains[retailer];
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname === domain || url.hostname.endsWith(`.${domain}`))
    );
  } catch {
    return false;
  }
}

export function parseProductView(value: unknown): ProductView | null {
  if (!isRecord(value) || !RETAILERS.includes(value.retailer as Retailer)) return null;
  const retailer = value.retailer as Retailer;
  if (
    !validRetailerUrl(value.canonicalUrl, retailer) ||
    !nonEmptyString(value.title, 500) ||
    (value.productId !== undefined && !nonEmptyString(value.productId, 128)) ||
    (value.upc !== undefined && (!nonEmptyString(value.upc, 14) || !validGtin(value.upc))) ||
    (value.selectedVariant !== undefined && !nonEmptyString(value.selectedVariant, 200)) ||
    !Number.isSafeInteger(value.currentPriceCents) ||
    (value.currentPriceCents as number) <= 0 ||
    value.currency !== 'USD' ||
    !PRICE_CONTEXTS.includes(value.priceContext as PriceContext) ||
    !['in-stock', 'out-of-stock', 'unknown'].includes(String(value.availability)) ||
    (value.locationId !== undefined && !nonEmptyString(value.locationId, 128))
  ) {
    return null;
  }
  if (value.priceContext !== 'online' && !nonEmptyString(value.locationId, 128)) return null;
  return value as ProductView;
}

export function parseLocations(value: unknown): RetailerLocationSelection | null {
  if (value === undefined) return {};
  if (!isRecord(value)) return null;
  const locations: RetailerLocationSelection = {};
  for (const [retailer, locationId] of Object.entries(value)) {
    if (!RETAILERS.includes(retailer as Retailer) || !nonEmptyString(locationId, 128)) return null;
    locations[retailer as Retailer] = locationId;
  }
  return locations;
}

export function parseStoreQuery(url: URL): { retailer: Retailer; postalCode: string } | null {
  const retailer = url.searchParams.get('retailer');
  const postalCode = url.searchParams.get('postalCode');
  if (
    !RETAILERS.includes(retailer as Retailer) ||
    !postalCode ||
    !/^\d{5}(?:-\d{4})?$/.test(postalCode)
  ) {
    return null;
  }
  return { retailer: retailer as Retailer, postalCode };
}
