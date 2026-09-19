import type { ProductView } from '../adapters/index.js';
import { RETAILERS, type Retailer } from '../shared/config.js';
import type { RetailerLocations } from '../shared/settings.js';
import type {
  ComparisonApiResponse,
  Money,
  PriceContext,
  ShowComparison,
} from '../shared/types.js';

const PRICE_CONTEXTS: PriceContext[] = ['online', 'store-pickup', 'in-store'];
const RETAILER_HOSTS: Record<Retailer, string> = {
  cvs: 'cvs.com',
  kroger: 'kroger.com',
  walmart: 'walmart.com',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maxLength = 2_048): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isRetailer(value: unknown): value is Retailer {
  return RETAILERS.includes(value as Retailer);
}

function isPriceContext(value: unknown): value is PriceContext {
  return PRICE_CONTEXTS.includes(value as PriceContext);
}

function isMoney(value: unknown): value is Money {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.amountCents) &&
    (value.amountCents as number) > 0 &&
    value.currency === 'USD'
  );
}

function isRetailerUrl(value: unknown, retailer: Retailer): value is string {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    const domain = RETAILER_HOSTS[retailer];
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

function isIsoDate(value: unknown): value is string {
  return isString(value, 100) && Number.isFinite(Date.parse(value));
}

function parseShow(value: Record<string, unknown>): ShowComparison | null {
  if (
    !isRecord(value.product) ||
    !isString(value.product.id, 200) ||
    !isString(value.product.name, 500) ||
    (value.product.brand !== undefined && !isString(value.product.brand, 200)) ||
    !isString(value.product.variant, 200) ||
    !isRecord(value.product.size) ||
    typeof value.product.size.amount !== 'number' ||
    !Number.isFinite(value.product.size.amount) ||
    value.product.size.amount <= 0 ||
    !['oz', 'ml', 'count'].includes(String(value.product.size.unit)) ||
    !isRecord(value.current) ||
    !isRetailer(value.current.retailer) ||
    !isMoney(value.current.price) ||
    !isPriceContext(value.current.priceContext) ||
    (value.current.locationId !== undefined && !isString(value.current.locationId, 128)) ||
    !isRecord(value.alternative) ||
    !isRetailer(value.alternative.retailer) ||
    value.alternative.retailer === value.current.retailer ||
    !isString(value.alternative.productId, 128) ||
    !isRetailerUrl(value.alternative.url, value.alternative.retailer) ||
    !isMoney(value.alternative.price) ||
    !isPriceContext(value.alternative.priceContext) ||
    value.alternative.priceContext !== value.current.priceContext ||
    value.alternative.condition !== 'new' ||
    value.alternative.availability !== 'in-stock' ||
    (value.alternative.locationId !== undefined && !isString(value.alternative.locationId, 128)) ||
    !isIsoDate(value.alternative.observedAt) ||
    !isIsoDate(value.alternative.expiresAt) ||
    Date.parse(value.alternative.observedAt) >= Date.parse(value.alternative.expiresAt) ||
    Date.parse(value.alternative.expiresAt) <= Date.now() ||
    !isMoney(value.savings) ||
    value.current.price.amountCents - value.alternative.price.amountCents !==
      value.savings.amountCents ||
    (value.current.priceContext !== 'online' &&
      (!isString(value.current.locationId, 128) || !isString(value.alternative.locationId, 128))) ||
    !isString(value.rationale, 1_000) ||
    !['upc', 'retailer-product-id', 'canonical-url'].includes(String(value.matchedBy))
  ) {
    return null;
  }
  return value as unknown as ShowComparison;
}

export function parseComparisonResponse(value: unknown): ComparisonApiResponse | null {
  if (!isRecord(value)) return null;
  if (value.status === 'show') return parseShow(value);
  if (value.status !== 'no-match' && value.status !== 'suppressed') return null;
  if (value.reason !== undefined && !isString(value.reason, 100)) return null;
  return {
    status: value.status,
    ...(typeof value.reason === 'string' ? { reason: value.reason } : {}),
  };
}

export async function requestComparison(
  current: ProductView,
  locations: RetailerLocations,
  signal?: AbortSignal,
): Promise<ComparisonApiResponse | null> {
  try {
    if (signal?.aborted) return null;
    const response: unknown = await chrome.runtime.sendMessage({
      type: 'pinkless:compare',
      payload: { current, locations },
    });
    if (signal?.aborted) return null;
    return parseComparisonResponse(response);
  } catch {
    return null;
  }
}
