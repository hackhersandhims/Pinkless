import { RETAILER, STORE_PRICE_CONTEXT } from '../shared/config.js';
import type { SelectedStore } from '../shared/settings.js';
import type { PageLocation, ProductView, RetailerAdapter } from './types.js';

type JsonRecord = Record<string, unknown>;

type AdapterConfig = {
  /** Whether this adapter runs on the page URL at all. */
  canHandle: (url: URL) => boolean;
  /** Whether a URL is an acceptable canonical Kroger product URL. */
  isCanonical: (url: URL) => boolean;
  productIdFromUrl: (url: URL) => string | undefined;
  /** A match on any of these means the visible price is not the ordinary one-time price. */
  blockedPriceSelectors: string[];
};

type ExtractedOffer = {
  currentPriceCents: number;
  currency: 'USD';
  availability: ProductView['availability'];
};

const SELECTED_VARIANT_SELECTORS = [
  '[data-testid="variant-option"][aria-checked="true"]',
  '[data-testid="variant-option"][data-selected="true"]',
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned && cleaned.length <= maxLength ? cleaned : undefined;
}

function typesOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isSchemaType(value: unknown, expected: string): boolean {
  return typesOf(value).some(
    (type) => type.split('/').pop()?.toLowerCase() === expected.toLowerCase(),
  );
}

function collectStructuredProducts(value: unknown, products: JsonRecord[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectStructuredProducts(item, products);
    return;
  }
  if (!isRecord(value)) return;
  if (isSchemaType(value['@type'], 'Product')) products.push(value);
  if (value['@graph'] !== undefined) collectStructuredProducts(value['@graph'], products);
}

function readStructuredProduct(document: Document): JsonRecord | null {
  const products: JsonRecord[] = [];
  for (const script of document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )) {
    const source = script.textContent?.trim();
    if (!source || source.length > 1_000_000) continue;
    try {
      collectStructuredProducts(JSON.parse(source) as unknown, products);
    } catch {
      // A malformed structured-data block is untrusted and ignored.
    }
  }
  return products.length === 1 ? products[0]! : null;
}

/** "6.79" -> 679. Integer arithmetic on the digit strings; no float ever holds the price. */
function parsePriceCents(value: unknown): number | null {
  const price = typeof value === 'number' ? String(value) : cleanText(value, 32);
  const match = price?.match(/^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number.parseInt(match[1]!, 10);
  const fractional = (match[2] ?? '').padEnd(2, '0');
  const cents = whole * 100 + Number.parseInt(fractional, 10);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
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

/**
 * The page's manufacturer GTIN, if any. Kroger's 13-digit productId is the UPC without its check
 * digit, so a GTIN field that just echoes the productId is not a UPC and is ignored. Any other
 * GTIN must be unique and check-digit valid, or the page is ambiguous (null).
 */
function readGtin(product: JsonRecord, productId: string): string | null | undefined {
  const values = ['gtin14', 'gtin13', 'gtin12', 'gtin8', 'gtin']
    .map((key) => cleanText(product[key], 14))
    .filter((value): value is string => value !== undefined && value !== productId);
  const unique = [...new Set(values)];
  if (unique.length === 0) return undefined;
  return unique.length === 1 && validGtin(unique[0]!) ? unique[0]! : null;
}

function selectedElement(document: Document, selectors: string[]): Element | null | undefined {
  const elements = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
  const unique = [...new Set(elements)];
  if (unique.length > 1) return null;
  return unique[0];
}

/**
 * The page must not disagree with itself about which package is selected. The label is not sent:
 * Kroger's productId already identifies the packaged item, and the page's free-text size label
 * ("4 ct") is never the catalog's reviewed variant string.
 */
function variantIsConsistent(document: Document, product: JsonRecord): boolean {
  const element = selectedElement(document, SELECTED_VARIANT_SELECTORS);
  if (element === null) return false;
  const fromDocument = element
    ? cleanText(element.getAttribute('data-variant') ?? element.textContent, 200)
    : undefined;
  const fromProduct = cleanText(product.size, 200) ?? cleanText(product.model, 200);
  return !(fromDocument && fromProduct && fromDocument.toLowerCase() !== fromProduct.toLowerCase());
}

function readAvailability(value: unknown): ProductView['availability'] {
  const normalized = cleanText(value, 200)?.split('/').pop()?.toLowerCase();
  if (normalized === 'instock' || normalized === 'limitedavailability') return 'in-stock';
  if (normalized === 'outofstock' || normalized === 'soldout' || normalized === 'discontinued') {
    return 'out-of-stock';
  }
  return 'unknown';
}

function readOffer(
  document: Document,
  product: JsonRecord,
  config: AdapterConfig,
): ExtractedOffer | null {
  if (config.blockedPriceSelectors.some((selector) => document.querySelector(selector))) {
    return null;
  }

  const rawOffers = Array.isArray(product.offers) ? product.offers : [product.offers];
  const offers = rawOffers.filter(isRecord);
  if (offers.length !== 1) return null;
  const offer = offers[0]!;
  if (
    isSchemaType(offer['@type'], 'AggregateOffer') ||
    offer.lowPrice !== undefined ||
    offer.highPrice !== undefined
  ) {
    return null;
  }

  const priceSpecification = isRecord(offer.priceSpecification)
    ? offer.priceSpecification
    : undefined;
  const priceType = cleanText(priceSpecification?.priceType, 200)?.toLowerCase();
  if (priceType && /(sale|member|subscription|coupon|promo)/.test(priceType)) return null;

  const prices = [offer.price, priceSpecification?.price]
    .filter((value) => value !== undefined)
    .map(parsePriceCents);
  if (prices.length === 0 || prices.some((price) => price === null)) return null;
  const uniquePrices = [...new Set(prices as number[])];
  if (uniquePrices.length !== 1) return null;

  const currencies = [offer.priceCurrency, priceSpecification?.priceCurrency]
    .map((value) => cleanText(value, 8))
    .filter((value): value is string => value !== undefined);
  if (currencies.length === 0 || [...new Set(currencies)].length !== 1 || currencies[0] !== 'USD') {
    return null;
  }

  return {
    currentPriceCents: uniquePrices[0]!,
    currency: 'USD',
    availability: readAvailability(offer.availability),
  };
}

function canonicalUrl(document: Document, currentUrl: URL, config: AdapterConfig): string | null {
  const href = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  try {
    const canonical = href ? new URL(href, currentUrl) : new URL(currentUrl);
    canonical.hash = '';
    canonical.search = '';
    if (
      canonical.protocol !== 'https:' ||
      canonical.username ||
      canonical.password ||
      !config.isCanonical(canonical)
    ) {
      return null;
    }
    return canonical.href;
  } catch {
    return null;
  }
}

/** Reads a schema.org Product/Offer from the page and pins it to the selected Kroger store. */
export function extractStructuredProduct(
  document: Document,
  location: PageLocation,
  store: SelectedStore | undefined,
  config: AdapterConfig,
): ProductView | null {
  if (!store?.locationId) return null;

  let currentUrl: URL;
  try {
    currentUrl = new URL(location.href);
  } catch {
    return null;
  }
  if (!config.canHandle(currentUrl)) return null;

  const product = readStructuredProduct(document);
  if (!product) return null;
  const title = cleanText(product.name);
  const canonical = canonicalUrl(document, currentUrl, config);
  const urlProductId = config.productIdFromUrl(currentUrl);
  const canonicalProductId = canonical ? config.productIdFromUrl(new URL(canonical)) : undefined;
  const structuredProductId = cleanText(product.sku, 128) ?? cleanText(product.productID, 128);
  const productId = urlProductId ?? canonicalProductId ?? structuredProductId;
  if (
    !title ||
    !canonical ||
    !productId ||
    (structuredProductId && structuredProductId !== productId) ||
    (urlProductId && canonicalProductId && urlProductId !== canonicalProductId)
  ) {
    return null;
  }

  const upc = readGtin(product, productId);
  if (upc === null) return null;
  if (!variantIsConsistent(document, product)) return null;
  const offer = readOffer(document, product, config);
  if (!offer) return null;

  return {
    retailer: RETAILER,
    canonicalUrl: canonical,
    productId,
    ...(upc ? { upc } : {}),
    title,
    ...offer,
    priceContext: STORE_PRICE_CONTEXT,
    locationId: store.locationId,
  };
}

export function createStructuredProductAdapter(config: AdapterConfig): RetailerAdapter {
  return {
    canHandle: (url) => config.canHandle(url),
    extract: (document, location, store) =>
      extractStructuredProduct(document, location, store, config),
  };
}
