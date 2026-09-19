import { demoRetailerForUrl, type Retailer } from '../shared/config.js';
import type { PageLocation, ProductView, RetailerAdapter } from './types.js';

const DEMO_PRODUCT_SELECTOR = '[data-pinkless-demo-product]';

function clean(value: string | null, maxLength = 2_048): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned && cleaned.length <= maxLength ? cleaned : undefined;
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

function isCanonicalRetailerUrl(value: string, retailer: Retailer): boolean {
  try {
    const url = new URL(value);
    const host = `${retailer}.com`;
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname === host || url.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

function selectedDemoProduct(document: Document): HTMLElement | null {
  const products = [...document.querySelectorAll<HTMLElement>(DEMO_PRODUCT_SELECTOR)];
  return products.length === 1 ? products[0]! : null;
}

function extractDemoProduct(
  document: Document,
  location: PageLocation,
  retailer: Retailer,
): ProductView | null {
  let url: URL;
  try {
    url = new URL(location.href);
  } catch {
    return null;
  }
  if (demoRetailerForUrl(url) !== retailer) return null;

  const product = selectedDemoProduct(document);
  if (!product || product.dataset.retailer !== retailer) return null;

  const canonicalUrl = clean(product.dataset.canonicalUrl ?? null);
  const productId = clean(product.dataset.productId ?? null, 128);
  const upc = clean(product.dataset.upc ?? null, 14);
  const title = clean(product.dataset.title ?? null, 500);
  const selectedVariant = clean(product.dataset.selectedVariant ?? null, 200);
  const locationId = clean(product.dataset.locationId ?? null, 128);
  const currentPriceCents = Number.parseInt(product.dataset.currentPriceCents ?? '', 10);
  if (
    !canonicalUrl ||
    !isCanonicalRetailerUrl(canonicalUrl, retailer) ||
    !productId ||
    !/^[a-z0-9-]{3,128}$/i.test(productId) ||
    !upc ||
    !validGtin(upc) ||
    !title ||
    !selectedVariant ||
    !Number.isSafeInteger(currentPriceCents) ||
    currentPriceCents <= 0 ||
    product.dataset.currency !== 'USD' ||
    product.dataset.availability !== 'in-stock' ||
    product.dataset.priceContext !== 'store-pickup' ||
    !locationId
  ) {
    return null;
  }

  return {
    retailer,
    canonicalUrl,
    productId,
    upc,
    title,
    selectedVariant,
    currentPriceCents,
    currency: 'USD',
    priceContext: 'store-pickup',
    locationId,
    availability: 'in-stock',
  };
}

function createDemoAdapter(retailer: Retailer): RetailerAdapter {
  return {
    retailer,
    canHandle: (url) => demoRetailerForUrl(url) === retailer,
    extract: (document, location) => extractDemoProduct(document, location, retailer),
  };
}

export const cvsDemoAdapter = createDemoAdapter('cvs');
export const krogerDemoAdapter = createDemoAdapter('kroger');
export const walmartDemoAdapter = createDemoAdapter('walmart');
