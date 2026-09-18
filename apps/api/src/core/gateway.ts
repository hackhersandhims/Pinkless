import type { Offer, Retailer } from '../../../../packages/catalog/src/schema.js';
import { ProviderError, type OfferLookup, type RetailerLocation } from '../providers/types.js';
import type { ProviderRegistry } from '../providers/registry.js';

export type ProviderLookupState =
  'ok' | 'unavailable' | 'timeout' | 'rate-limited' | 'invalid-response' | 'error';

export type OfferLookupResult = {
  retailer: Retailer;
  state: ProviderLookupState;
  offers: Offer[];
  cacheHit: boolean;
};

export type LocationLookupResult = {
  retailer: Retailer;
  state: ProviderLookupState;
  locations: RetailerLocation[];
};

type GatewayOptions = {
  now?: () => Date;
  timeoutMs?: number;
  maxRequestsPerWindow?: number;
  rateWindowMs?: number;
  emptyCacheTtlMs?: number;
};

type CacheEntry = { offers: Offer[]; expiresAtMs: number };

class SlidingWindowRateLimiter {
  private readonly requests = new Map<Retailer, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  allow(retailer: Retailer, nowMs: number): boolean {
    const active = (this.requests.get(retailer) ?? []).filter(
      (timestamp) => timestamp > nowMs - this.windowMs,
    );
    if (active.length >= this.limit) {
      this.requests.set(retailer, active);
      return false;
    }
    active.push(nowMs);
    this.requests.set(retailer, active);
    return true;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('provider-timeout')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function validOffer(offer: Offer, retailer: Retailer, query: OfferLookup, nowMs: number): boolean {
  const observedAt = Date.parse(offer.observedAt);
  const expiresAt = Date.parse(offer.expiresAt);
  let validUrl = false;
  try {
    validUrl = new URL(offer.url).protocol === 'https:';
  } catch {
    validUrl = false;
  }
  return (
    offer.retailer === retailer &&
    (!query.productId || offer.productId === query.productId) &&
    offer.url === query.url &&
    validUrl &&
    offer.price.currency === 'USD' &&
    Number.isSafeInteger(offer.price.amountCents) &&
    offer.price.amountCents > 0 &&
    offer.priceContext === query.priceContext &&
    offer.condition === 'new' &&
    ['in-stock', 'out-of-stock', 'unknown'].includes(offer.availability) &&
    (offer.locationId ?? '') === (query.locationId ?? '') &&
    Number.isFinite(observedAt) &&
    Number.isFinite(expiresAt) &&
    observedAt < expiresAt &&
    expiresAt > nowMs
  );
}

function failureState(error: unknown): ProviderLookupState {
  if (error instanceof Error && error.message === 'provider-timeout') return 'timeout';
  if (error instanceof ProviderError && error.code === 'invalid-response')
    return 'invalid-response';
  if (error instanceof ProviderError && error.code === 'not-configured') return 'unavailable';
  return 'error';
}

export class ProviderGateway {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly now: () => Date;
  private readonly timeoutMs: number;
  private readonly emptyCacheTtlMs: number;
  private readonly rateLimiter: SlidingWindowRateLimiter;

  constructor(
    private readonly providers: ProviderRegistry,
    options: GatewayOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = options.timeoutMs ?? 4_000;
    this.emptyCacheTtlMs = options.emptyCacheTtlMs ?? 30_000;
    this.rateLimiter = new SlidingWindowRateLimiter(
      options.maxRequestsPerWindow ?? 60,
      options.rateWindowMs ?? 60_000,
    );
  }

  private cacheKey(retailer: Retailer, query: OfferLookup): string {
    return [
      retailer,
      query.productId ?? query.upc ?? '',
      query.locationId ?? '',
      query.priceContext,
    ].join(':');
  }

  async lookupOffers(retailer: Retailer, query: OfferLookup): Promise<OfferLookupResult> {
    const provider = this.providers[retailer];
    if (!provider.status.available) {
      return { retailer, state: 'unavailable', offers: [], cacheHit: false };
    }
    const nowMs = this.now().valueOf();
    const key = this.cacheKey(retailer, query);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAtMs > nowMs) {
      return { retailer, state: 'ok', offers: cached.offers, cacheHit: true };
    }
    this.cache.delete(key);
    if (!this.rateLimiter.allow(retailer, nowMs)) {
      return { retailer, state: 'rate-limited', offers: [], cacheHit: false };
    }

    try {
      const offers = await withTimeout(provider.lookupOffers(query), this.timeoutMs);
      if (!offers.every((offer) => validOffer(offer, retailer, query, nowMs))) {
        return { retailer, state: 'invalid-response', offers: [], cacheHit: false };
      }
      const expiresAtMs =
        offers.length > 0
          ? Math.min(...offers.map((offer) => Date.parse(offer.expiresAt)))
          : nowMs + this.emptyCacheTtlMs;
      this.cache.set(key, { offers, expiresAtMs });
      return { retailer, state: 'ok', offers, cacheHit: false };
    } catch (error) {
      return { retailer, state: failureState(error), offers: [], cacheHit: false };
    }
  }

  async lookupLocations(retailer: Retailer, postalCode: string): Promise<LocationLookupResult> {
    const provider = this.providers[retailer];
    if (!provider.status.available) return { retailer, state: 'unavailable', locations: [] };
    const nowMs = this.now().valueOf();
    if (!this.rateLimiter.allow(retailer, nowMs)) {
      return { retailer, state: 'rate-limited', locations: [] };
    }
    try {
      const locations = await withTimeout(
        provider.lookupLocations({ postalCode, limit: 10 }),
        this.timeoutMs,
      );
      if (locations.some((location) => location.retailer !== retailer)) {
        return { retailer, state: 'invalid-response', locations: [] };
      }
      return { retailer, state: 'ok', locations };
    } catch (error) {
      return { retailer, state: failureState(error), locations: [] };
    }
  }
}
