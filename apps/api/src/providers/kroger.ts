import { Buffer } from 'node:buffer';
import type { Offer } from '../../../../packages/catalog/src/schema.js';
import {
  ProviderError,
  type LocationLookup,
  type OfferLookup,
  type ProductLookup,
  type ProviderProduct,
  type RetailerLocation,
  type RetailerProvider,
} from './types.js';

type KrogerProviderOptions = {
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
  now?: () => Date;
  apiBaseUrl?: string;
  tokenUrl?: string;
  offerTtlMs?: number;
  requestTimeoutMs?: number;
};

type CachedToken = { value: string; expiresAtMs: number };

const DEFAULT_API_BASE_URL = 'https://api.kroger.com/v1';
const DEFAULT_TOKEN_URL = 'https://api.kroger.com/v1/connect/oauth2/token';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function toCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  return Math.abs(cents / 100 - value) < 1e-9 && Number.isSafeInteger(cents) ? cents : null;
}

function identityFrom(query: ProductLookup): string | null {
  return requiredString(query.productId) ?? requiredString(query.upc);
}

function parseProduct(value: unknown): ProviderProduct | null {
  if (!isRecord(value)) return null;
  const productId = requiredString(value.productId);
  const name = requiredString(value.description);
  if (!productId || !name) return null;
  const size =
    Array.isArray(value.items) && value.items.length === 1 && isRecord(value.items[0])
      ? requiredString(value.items[0].size)
      : null;
  return {
    retailer: 'kroger',
    productId,
    ...(requiredString(value.upc) ? { upc: requiredString(value.upc)! } : {}),
    name,
    ...(requiredString(value.brand) ? { brand: requiredString(value.brand)! } : {}),
    ...(size ? { size } : {}),
  };
}

function parseLocation(value: unknown): RetailerLocation | null {
  if (!isRecord(value) || !isRecord(value.address)) return null;
  const locationId = requiredString(value.locationId);
  const name = requiredString(value.name);
  const line1 = requiredString(value.address.addressLine1);
  const city = requiredString(value.address.city);
  const state = requiredString(value.address.state);
  const postalCode = requiredString(value.address.zipCode);
  if (!locationId || !name || !line1 || !city || !state || !postalCode) return null;
  return {
    retailer: 'kroger',
    locationId,
    name,
    address: { line1, city, state, postalCode },
  };
}

function assertReviewedKrogerUrl(value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !/(^|\.)kroger\.com$/i.test(url.hostname)) throw new Error();
  } catch {
    throw new ProviderError(
      'kroger',
      'invalid-request',
      'Kroger offers require a reviewed HTTPS kroger.com URL.',
    );
  }
}

export class KrogerProvider implements RetailerProvider {
  readonly retailer = 'kroger' as const;
  readonly status = { available: true, mode: 'live' } as const;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly apiBaseUrl: string;
  private readonly tokenUrl: string;
  private readonly offerTtlMs: number;
  private readonly requestTimeoutMs: number;
  private token?: CachedToken;

  constructor(options: KrogerProviderOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.fetchImpl = options.fetch ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL;
    this.offerTtlMs = options.offerTtlMs ?? 15 * 60 * 1000;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5_000;
    if (!requiredString(this.clientId) || !requiredString(this.clientSecret)) {
      throw new ProviderError('kroger', 'not-configured', 'Kroger credentials are missing.');
    }
  }

  private async accessToken(): Promise<string> {
    const nowMs = this.now().valueOf();
    if (this.token && this.token.expiresAtMs > nowMs + 30_000) return this.token.value;

    let response: Response;
    try {
      response = await this.fetchImpl(this.tokenUrl, {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'product.compact' }),
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new ProviderError('kroger', 'upstream-error', 'Kroger authentication failed.');
    }
    if (!response.ok) {
      throw new ProviderError('kroger', 'upstream-error', 'Kroger authentication was rejected.');
    }
    const payload = (await response.json()) as unknown;
    if (!isRecord(payload) || !requiredString(payload.access_token)) {
      throw new ProviderError('kroger', 'invalid-response', 'Kroger returned an invalid token.');
    }
    const expiresIn =
      typeof payload.expires_in === 'number' && payload.expires_in > 0 ? payload.expires_in : 1_800;
    this.token = { value: payload.access_token as string, expiresAtMs: nowMs + expiresIn * 1000 };
    return this.token.value;
  }

  private async get(path: string, query: URLSearchParams): Promise<unknown> {
    const token = await this.accessToken();
    const url = new URL(`${this.apiBaseUrl}${path}`);
    query.forEach((value, key) => url.searchParams.set(key, value));
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new ProviderError('kroger', 'upstream-error', 'Kroger request failed.');
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ProviderError(
        'kroger',
        'upstream-error',
        `Kroger returned HTTP ${response.status}.`,
      );
    }
    return response.json() as Promise<unknown>;
  }

  private async rawProduct(query: ProductLookup): Promise<Record<string, unknown> | null> {
    const identity = identityFrom(query);
    if (!identity) {
      throw new ProviderError('kroger', 'invalid-request', 'A product ID or UPC is required.');
    }
    const params = new URLSearchParams();
    if (query.locationId) params.set('filter.locationId', query.locationId);
    const payload = await this.get(`/products/${encodeURIComponent(identity)}`, params);
    if (payload === null) return null;
    if (!isRecord(payload) || !isRecord(payload.data)) {
      throw new ProviderError('kroger', 'invalid-response', 'Kroger returned an invalid product.');
    }
    return payload.data;
  }

  async lookupProduct(query: ProductLookup): Promise<ProviderProduct | null> {
    const raw = await this.rawProduct(query);
    if (!raw) return null;
    const product = parseProduct(raw);
    if (!product) {
      throw new ProviderError(
        'kroger',
        'invalid-response',
        'Kroger product identity is incomplete.',
      );
    }
    if (query.productId && product.productId !== query.productId) return null;
    if (query.upc && product.upc !== query.upc) return null;
    return product;
  }

  async lookupLocations(query: LocationLookup): Promise<RetailerLocation[]> {
    if (!/^\d{5}(?:-\d{4})?$/.test(query.postalCode)) {
      throw new ProviderError('kroger', 'invalid-request', 'A valid US postal code is required.');
    }
    const params = new URLSearchParams({
      'filter.zipCode.near': query.postalCode,
      'filter.radiusInMiles': String(Math.max(1, Math.min(query.radiusMiles ?? 10, 100))),
      'filter.limit': String(Math.max(1, Math.min(query.limit ?? 10, 50))),
    });
    const payload = await this.get('/locations', params);
    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      throw new ProviderError('kroger', 'invalid-response', 'Kroger returned invalid locations.');
    }
    return payload.data.map(parseLocation).filter((location) => location !== null);
  }

  async lookupOffers(query: OfferLookup): Promise<Offer[]> {
    if (!query.locationId || query.priceContext === 'online') return [];
    assertReviewedKrogerUrl(query.url);
    const raw = await this.rawProduct(query);
    if (!raw) return [];
    const product = parseProduct(raw);
    if (!product) return [];
    if (query.productId && product.productId !== query.productId) return [];
    if (query.upc && product.upc !== query.upc) return [];
    if (!Array.isArray(raw.items) || raw.items.length !== 1 || !isRecord(raw.items[0])) return [];

    const item = raw.items[0];
    if (!isRecord(item.price)) return [];
    const amountCents = toCents(item.price.regular);
    if (amountCents === null) return [];

    const stockLevel = isRecord(item.inventory)
      ? requiredString(item.inventory.stockLevel)?.toUpperCase()
      : undefined;
    const stockAvailability =
      stockLevel === 'HIGH' || stockLevel === 'LOW'
        ? 'in-stock'
        : stockLevel === 'OUT_OF_STOCK' || stockLevel === 'TEMPORARILY_OUT_OF_STOCK'
          ? 'out-of-stock'
          : 'unknown';
    let availability: Offer['availability'] = stockAvailability;
    if (query.priceContext === 'store-pickup') {
      const curbside = isRecord(item.fulfillment) ? item.fulfillment.curbside : undefined;
      availability =
        curbside === true ? stockAvailability : curbside === false ? 'out-of-stock' : 'unknown';
    }

    const observedAt = this.now();
    return [
      {
        retailer: 'kroger',
        productId: product.productId,
        url: query.url,
        price: { amountCents, currency: 'USD' },
        priceContext: query.priceContext,
        condition: 'new',
        availability,
        locationId: query.locationId,
        observedAt: observedAt.toISOString(),
        expiresAt: new Date(observedAt.valueOf() + this.offerTtlMs).toISOString(),
      },
    ];
  }
}
