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

type CanopyProviderOptions = {
  apiKey: string;
  fetch?: typeof fetch;
  now?: () => Date;
  apiBaseUrl?: string;
  offerTtlMs?: number;
  requestTimeoutMs?: number;
};

const DEFAULT_API_BASE_URL = 'https://rest.canopyapi.co/api/amazon/product';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isAsin(value: string): boolean {
  return /^[A-Z0-9]{10}$/i.test(value);
}

/** Converts a provider display price to cents without float arithmetic. */
function displayPriceToCents(value: unknown): number | null {
  const display = requiredString(value);
  if (!display || !/^\$\d{1,9}(?:\.\d{2})?$/.test(display)) return null;
  const [whole, fraction = ''] = display.slice(1).split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function hasReviewedAmazonUrl(value: string, asin: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname === 'amazon.com' || url.hostname.endsWith('.amazon.com')) &&
      new RegExp(`/dp/${asin}(?:[/?]|$)`, 'i').test(url.pathname + url.search)
    );
  } catch {
    return false;
  }
}

type CanopyProduct = {
  asin: string;
  title: string;
  brand?: string;
  link: string;
  amountCents: number;
  availability: Offer['availability'];
};

function parseProduct(value: unknown): CanopyProduct | null {
  if (!isRecord(value)) return null;
  const asin = requiredString(value.asin);
  const title = requiredString(value.title);
  const link = requiredString(value.link);
  const price = isRecord(value.price) ? displayPriceToCents(value.price.displayString) : null;
  if (
    !asin ||
    !isAsin(asin) ||
    !title ||
    !link ||
    price === null ||
    !hasReviewedAmazonUrl(link, asin)
  ) {
    return null;
  }
  const status = isRecord(value.availability) ? requiredString(value.availability.status) : null;
  return {
    asin: asin.toUpperCase(),
    title,
    link,
    amountCents: price,
    availability: status === 'IN_STOCK' ? 'in-stock' : 'unknown',
    ...(requiredString(value.brand) ? { brand: requiredString(value.brand)! } : {}),
  };
}

/**
 * Normalizes Amazon product data supplied through the project-approved Canopy
 * connection. Only catalog-reviewed ASINs and canonical URLs can yield offers.
 */
export class CanopyProvider implements RetailerProvider {
  readonly retailer = 'amazon' as const;
  readonly status = { available: true, mode: 'live' } as const;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly apiBaseUrl: string;
  private readonly offerTtlMs: number;
  private readonly requestTimeoutMs: number;

  constructor(options: CanopyProviderOptions) {
    this.apiKey = options.apiKey.trim();
    this.fetchImpl = options.fetch ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.offerTtlMs = options.offerTtlMs ?? 5 * 60 * 1000;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5_000;
    if (!this.apiKey) {
      throw new ProviderError('amazon', 'not-configured', 'Canopy API key is missing.');
    }
  }

  private async rawProduct(asin: string): Promise<CanopyProduct | null> {
    const url = new URL(this.apiBaseUrl);
    url.searchParams.set('asin', asin);
    url.searchParams.set('domain', 'US');
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { 'API-KEY': this.apiKey, accept: 'application/json' },
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new ProviderError('amazon', 'upstream-error', 'Canopy product request failed.');
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ProviderError(
        'amazon',
        'upstream-error',
        `Canopy returned HTTP ${response.status}.`,
      );
    }
    const product = parseProduct((await response.json()) as unknown);
    if (!product) {
      throw new ProviderError('amazon', 'invalid-response', 'Canopy returned an invalid product.');
    }
    return product;
  }

  async lookupProduct(query: ProductLookup): Promise<ProviderProduct | null> {
    if (!query.productId || !isAsin(query.productId)) return null;
    const product = await this.rawProduct(query.productId);
    if (!product || product.asin !== query.productId.toUpperCase()) return null;
    return {
      retailer: 'amazon',
      productId: product.asin,
      name: product.title,
      ...(product.brand ? { brand: product.brand } : {}),
    };
  }

  async lookupLocations(_query: LocationLookup): Promise<RetailerLocation[]> {
    return [];
  }

  async lookupOffers(query: OfferLookup): Promise<Offer[]> {
    if (query.priceContext !== 'online' || !query.productId || !isAsin(query.productId)) return [];
    const asin = query.productId.toUpperCase();
    if (!hasReviewedAmazonUrl(query.url, asin)) {
      throw new ProviderError(
        'amazon',
        'invalid-request',
        'Amazon offers require a reviewed HTTPS amazon.com /dp/ ASIN URL.',
      );
    }
    const product = await this.rawProduct(asin);
    if (!product || product.asin !== asin || product.availability !== 'in-stock') return [];
    const observedAt = this.now();
    return [
      {
        retailer: 'amazon',
        productId: asin,
        url: query.url,
        price: { amountCents: product.amountCents, currency: 'USD' },
        priceContext: 'online',
        condition: 'new',
        availability: 'in-stock',
        observedAt: observedAt.toISOString(),
        expiresAt: new Date(observedAt.valueOf() + this.offerTtlMs).toISOString(),
      },
    ];
  }
}
