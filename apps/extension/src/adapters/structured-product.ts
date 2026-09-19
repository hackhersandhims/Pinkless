import type { PageLocation, ProductView, RetailerAdapter } from './types.js';

type JsonRecord = Record<string, unknown>;
type Retailer = ProductView['retailer'];
type PriceContext = NonNullable<ProductView['priceContext']>;

type AdapterConfig = {
  retailer: Retailer;
  canHandle: (url: URL) => boolean;
  productIdFromUrl: (url: URL) => string | undefined;
  blockedPriceSelectors: string[];
  allowedSeller?: string;
  defaultPriceContext?: 'online';
};

type ExtractedOffer = {
  currentPriceCents: number;
  currency: 'USD';
  availability: ProductView['availability'];
  priceContext: PriceContext;
  locationId?: string;
};

const SELECTED_VARIANT_SELECTORS = [
  '[data-testid="variant-option"][aria-checked="true"]',
  '[data-automation-id="variant-option"][aria-checked="true"]',
  '[data-testid="variant-option"][data-selected="true"]',
];

const SELECTED_FULFILLMENT_SELECTORS = [
  '[data-testid="fulfillment-option"][aria-checked="true"]',
  '[data-automation-id="fulfillment-option"][aria-checked="true"]',
  '[data-testid="fulfillment-option"][data-selected="true"]',
  '[role="radio"][data-fulfillment][aria-checked="true"]',
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

function parsePriceCents(value: unknown): number | null {
  const price = cleanText(value, 32);
  const match = price?.match(/^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number.parseInt(match[1]!, 10);
  const fractional = (match[2] ?? '').padEnd(2, '0');
  const cents = whole * 100 + Number.parseInt(fractional || '0', 10);
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

function readGtin(product: JsonRecord): string | null | undefined {
  const values = ['gtin14', 'gtin13', 'gtin12', 'gtin8', 'gtin']
    .map((key) => cleanText(product[key], 14))
    .filter((value): value is string => value !== undefined);
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

function readSelectedVariant(document: Document, product: JsonRecord): string | null | undefined {
  const element = selectedElement(document, SELECTED_VARIANT_SELECTORS);
  if (element === null) return null;
  const fromDocument = element
    ? cleanText(element.getAttribute('data-variant') ?? element.textContent, 200)
    : undefined;
  const fromProduct = cleanText(product.size, 200) ?? cleanText(product.model, 200);
  if (fromDocument && fromProduct && fromDocument.toLowerCase() !== fromProduct.toLowerCase()) {
    return null;
  }
  return fromDocument ?? fromProduct;
}

function fulfillmentContext(value: string): PriceContext | undefined {
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized.includes('onsitepickup') || normalized.includes('pickup')) return 'store-pickup';
  if (normalized.includes('instore')) return 'in-store';
  if (normalized.includes('parcelservice') || normalized === 'shipping' || normalized === 'ship') {
    return 'online';
  }
  return undefined;
}

function readFulfillment(
  document: Document,
  offer: JsonRecord,
  defaultPriceContext?: 'online',
): Pick<ExtractedOffer, 'priceContext' | 'locationId'> | null {
  const selected = selectedElement(document, SELECTED_FULFILLMENT_SELECTORS);
  if (selected === null) return null;

  const selectedValue = selected
    ? [
        selected.getAttribute('data-method'),
        selected.getAttribute('data-fulfillment'),
        selected.textContent,
      ]
        .map((value) => cleanText(value, 100))
        .find((value) => value && fulfillmentContext(value))
    : undefined;
  const deliveryMethods = Array.isArray(offer.availableDeliveryMethod)
    ? offer.availableDeliveryMethod
    : [offer.availableDeliveryMethod];
  const offerContexts = deliveryMethods
    .map((value) => cleanText(value, 200))
    .filter((value): value is string => Boolean(value))
    .map(fulfillmentContext)
    .filter((value): value is PriceContext => value !== undefined);
  const uniqueOfferContexts = [...new Set(offerContexts)];
  if (uniqueOfferContexts.length > 1) return null;

  const selectedContext = selectedValue ? fulfillmentContext(selectedValue) : undefined;
  const offerContext = uniqueOfferContexts[0];
  if (selectedContext && offerContext && selectedContext !== offerContext) return null;
  const priceContext = selectedContext ?? offerContext ?? defaultPriceContext;
  if (!priceContext) return null;

  const locationId = selected
    ? cleanText(
        selected.getAttribute('data-location-id') ?? selected.getAttribute('data-store-id'),
        128,
      )
    : undefined;
  if (priceContext !== 'online' && !locationId) return null;
  return { priceContext, ...(locationId ? { locationId } : {}) };
}

function readAvailability(value: unknown): ProductView['availability'] {
  const normalized = cleanText(value, 200)?.split('/').pop()?.toLowerCase();
  if (normalized === 'instock' || normalized === 'limitedavailability') return 'in-stock';
  if (normalized === 'outofstock' || normalized === 'soldout' || normalized === 'discontinued') {
    return 'out-of-stock';
  }
  return 'unknown';
}

function readSellerName(offer: JsonRecord): string | undefined {
  if (typeof offer.seller === 'string') return cleanText(offer.seller, 200);
  return isRecord(offer.seller) ? cleanText(offer.seller.name, 200) : undefined;
}

function readOffer(
  document: Document,
  product: JsonRecord,
  config: AdapterConfig,
): ExtractedOffer | null {
  if (config.blockedPriceSelectors.some((selector) => document.querySelector(selector)))
    return null;

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

  if (config.allowedSeller) {
    const seller = readSellerName(offer);
    if (!seller || seller.toLowerCase() !== config.allowedSeller.toLowerCase()) return null;
  }

  const fulfillment = readFulfillment(document, offer, config.defaultPriceContext);
  if (!fulfillment) return null;
  return {
    currentPriceCents: uniquePrices[0]!,
    currency: 'USD',
    availability: readAvailability(offer.availability),
    ...fulfillment,
  };
}

function canonicalUrl(
  document: Document,
  currentUrl: URL,
  canHandle: (url: URL) => boolean,
): string | null {
  const href = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  try {
    const canonical = href ? new URL(href, currentUrl) : new URL(currentUrl);
    canonical.hash = '';
    if (
      canonical.protocol !== 'https:' ||
      canonical.username ||
      canonical.password ||
      !canHandle(canonical)
    ) {
      return null;
    }
    return canonical.href;
  } catch {
    return null;
  }
}

export function createStructuredProductAdapter(config: AdapterConfig): RetailerAdapter {
  return {
    retailer: config.retailer,
    canHandle(url) {
      return config.canHandle(url);
    },
    extract(document: Document, location: PageLocation): ProductView | null {
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
      const canonical = canonicalUrl(document, currentUrl, config.canHandle);
      const urlProductId = config.productIdFromUrl(currentUrl);
      const canonicalProductId = canonical
        ? config.productIdFromUrl(new URL(canonical))
        : undefined;
      const structuredProductId = cleanText(product.sku, 128);
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

      const upc = readGtin(product);
      if (upc === null) return null;
      const selectedVariant = readSelectedVariant(document, product);
      if (selectedVariant === null) return null;
      const offer = readOffer(document, product, config);
      if (!offer) return null;

      return {
        retailer: config.retailer,
        canonicalUrl: canonical,
        productId,
        ...(upc ? { upc } : {}),
        title,
        ...(selectedVariant ? { selectedVariant } : {}),
        ...offer,
      };
    },
  };
}
