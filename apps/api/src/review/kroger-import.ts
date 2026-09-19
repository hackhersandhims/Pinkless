import {
  CATEGORIES,
  MARKETED_TO,
  type Category,
  type MarketedTo,
  type Size,
} from '../../../../packages/catalog/src/schema.js';
import type { RetailerProvider } from '../providers/types.js';
import {
  parseReviewCandidateRequest,
  type ReviewCandidateRequest,
  type ReviewProductInput,
} from './candidates.js';

const IMPORT_CONCURRENCY = 8;

export type KrogerReviewSeed = {
  productId: string;
  canonicalUrl: string;
  variant: string;
  category: Category;
  size: Size;
  marketedTo: MarketedTo;
};

export type KrogerReviewImportRequest = {
  krogerProducts: KrogerReviewSeed[];
  maxCandidates: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function parseSize(value: unknown): Size | null {
  if (
    !isRecord(value) ||
    typeof value.amount !== 'number' ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0 ||
    !['oz', 'ml', 'count'].includes(String(value.unit))
  ) {
    return null;
  }
  return value as Size;
}

function canonicalUrlForProduct(value: unknown, productId: string): string | null {
  if (!nonEmptyString(value, 2_048)) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.hostname !== 'kroger.com' && !url.hostname.endsWith('.kroger.com')) ||
      !new RegExp(`/p/[a-z0-9-]+/${productId}/?$`, 'i').test(url.pathname)
    ) {
      return null;
    }
    url.hash = '';
    url.search = '';
    return url.href;
  } catch {
    return null;
  }
}

function parseSeed(value: unknown): KrogerReviewSeed | null {
  if (
    !isRecord(value) ||
    typeof value.productId !== 'string' ||
    !/^\d{13}$/.test(value.productId)
  ) {
    return null;
  }
  const canonicalUrl = canonicalUrlForProduct(value.canonicalUrl, value.productId);
  const size = parseSize(value.size);
  if (
    !canonicalUrl ||
    !nonEmptyString(value.variant, 300) ||
    !CATEGORIES.includes(value.category as Category) ||
    !MARKETED_TO.includes(value.marketedTo as MarketedTo) ||
    !size
  ) {
    return null;
  }
  return {
    productId: value.productId,
    canonicalUrl,
    variant: value.variant,
    category: value.category as Category,
    size,
    marketedTo: value.marketedTo as MarketedTo,
  };
}

/** Parses reviewer classifications while leaving names, brands, UPCs, and source sizes to Kroger. */
export function parseKrogerReviewImportRequest(value: unknown): KrogerReviewImportRequest | null {
  if (!isRecord(value) || !Array.isArray(value.krogerProducts)) return null;
  if (value.krogerProducts.length < 2 || value.krogerProducts.length > 40) return null;
  const krogerProducts = value.krogerProducts.map(parseSeed);
  if (krogerProducts.some((product) => product === null)) return null;
  const products = krogerProducts as KrogerReviewSeed[];
  if (new Set(products.map((product) => product.productId)).size !== products.length) return null;
  if (
    !products.some((product) => product.marketedTo === 'women') ||
    !products.some((product) => product.marketedTo !== 'women')
  ) {
    return null;
  }
  const maxCandidates = value.maxCandidates ?? 12;
  if (
    typeof maxCandidates !== 'number' ||
    !Number.isSafeInteger(maxCandidates) ||
    maxCandidates < 1 ||
    maxCandidates > 25
  ) {
    return null;
  }
  return { krogerProducts: products, maxCandidates };
}

function usableGtin(value: string | undefined): string | undefined {
  if (!value || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return undefined;
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  for (let index = digits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += digits[index]! * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === checkDigit ? value : undefined;
}

/**
 * Resolves every seed through Kroger's official provider. One missing or inconsistent product
 * suppresses the entire draft so Gemini never receives a mixture of verified and guessed data.
 */
export async function importKrogerReviewProducts(
  request: KrogerReviewImportRequest,
  provider: RetailerProvider,
): Promise<ReviewCandidateRequest | null> {
  if (provider.retailer !== 'kroger' || !provider.status.available) return null;
  try {
    const imported: Array<ReviewProductInput | null> = new Array(request.krogerProducts.length);
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < request.krogerProducts.length) {
        const index = next++;
        const seed = request.krogerProducts[index]!;
        const product = await provider.lookupProduct({ productId: seed.productId });
        if (!product || product.retailer !== 'kroger' || product.productId !== seed.productId) {
          imported[index] = null;
          continue;
        }
        const upc = usableGtin(product.upc);
        imported[index] = {
          name: product.name,
          ...(product.brand ? { brand: product.brand } : {}),
          variant: seed.variant,
          category: seed.category,
          size: seed.size,
          marketedTo: seed.marketedTo,
          productId: product.productId,
          ...(upc ? { upc } : {}),
          canonicalUrl: seed.canonicalUrl,
          ...(product.size ? { sourceSize: product.size } : {}),
        };
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(IMPORT_CONCURRENCY, request.krogerProducts.length) }, worker),
    );
    if (imported.some((product) => product === null)) return null;
    return parseReviewCandidateRequest({
      products: imported,
      maxCandidates: request.maxCandidates,
    });
  } catch {
    return null;
  }
}
