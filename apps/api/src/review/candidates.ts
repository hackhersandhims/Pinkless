import {
  CATEGORIES,
  MARKETED_TO,
  type Category,
  type MarketedTo,
  type Size,
} from '../../../../packages/catalog/src/schema.js';

export type ReviewProductInput = {
  name: string;
  brand?: string;
  variant?: string;
  category: Category;
  size: Size;
  marketedTo: MarketedTo;
  productId?: string;
  upc?: string;
  canonicalUrl?: string;
  /** Kroger's display-size text, retained so the human reviewer can verify `size`. */
  sourceSize?: string;
};

export type ReviewCandidate = {
  womenProductIndex: number;
  alternativeProductIndex: number;
  rationale: string;
  matchedAttributes: string[];
  knownDifferences: string[];
  confidence: 'high' | 'medium' | 'low';
  /** Gemini drafts candidates only. A person must create and approve any catalog record. */
  requiresHumanReview: true;
};

export type ReviewCandidateRequest = {
  products: ReviewProductInput[];
  maxCandidates: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function validKrogerUrl(value: unknown): value is string {
  if (!nonEmptyString(value, 2_048)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname === 'kroger.com' || url.hostname.endsWith('.kroger.com'))
    );
  } catch {
    return false;
  }
}

function validProductId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{13}$/.test(value);
}

function validGtin(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  for (let index = digits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += digits[index]! * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

function parseProduct(value: unknown): ReviewProductInput | null {
  if (!isRecord(value)) return null;
  const size = value.size;
  if (
    !nonEmptyString(value.name, 500) ||
    (value.brand !== undefined && !nonEmptyString(value.brand, 200)) ||
    (value.variant !== undefined && !nonEmptyString(value.variant, 300)) ||
    !CATEGORIES.includes(value.category as Category) ||
    !MARKETED_TO.includes(value.marketedTo as MarketedTo) ||
    !isRecord(size) ||
    !Number.isFinite(size.amount) ||
    typeof size.amount !== 'number' ||
    size.amount <= 0 ||
    !['oz', 'ml', 'count'].includes(String(size.unit)) ||
    (value.productId !== undefined && !validProductId(value.productId)) ||
    (value.upc !== undefined && !validGtin(value.upc)) ||
    (value.canonicalUrl !== undefined && !validKrogerUrl(value.canonicalUrl)) ||
    (value.sourceSize !== undefined && !nonEmptyString(value.sourceSize, 100))
  ) {
    return null;
  }
  if (
    value.productId !== undefined &&
    value.canonicalUrl !== undefined &&
    !new URL(value.canonicalUrl).pathname.endsWith(`/${value.productId}`)
  ) {
    return null;
  }
  return value as ReviewProductInput;
}

/** Parses private reviewer input; shopper-facing routes never call this. */
export function parseReviewCandidateRequest(value: unknown): ReviewCandidateRequest | null {
  if (!isRecord(value) || !Array.isArray(value.products) || value.products.length < 2) return null;
  if (value.products.length > 40) return null;
  const products = value.products.map(parseProduct);
  if (products.some((product) => product === null)) return null;
  const maxCandidates = value.maxCandidates ?? 12;
  if (
    typeof maxCandidates !== 'number' ||
    !Number.isSafeInteger(maxCandidates) ||
    maxCandidates < 1 ||
    maxCandidates > 25
  ) {
    return null;
  }
  return { products: products as ReviewProductInput[], maxCandidates };
}

function sameSize(left: Size, right: Size): boolean {
  return left.amount === right.amount && left.unit === right.unit;
}

function stringList(value: unknown, maxItems: number): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) return null;
  return value.every((item) => nonEmptyString(item, 300)) ? (value as string[]) : null;
}

/**
 * Gemini output is treated as untrusted. This keeps only candidates that already satisfy the
 * non-negotiable structural checks; it never writes a catalog record or enables a badge.
 */
export function validateReviewCandidates(
  value: unknown,
  products: ReviewProductInput[],
  maxCandidates: number,
): ReviewCandidate[] {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return [];
  const candidates: ReviewCandidate[] = [];
  const pairs = new Set<string>();
  for (const raw of value.candidates) {
    if (candidates.length >= maxCandidates || !isRecord(raw)) continue;
    const womenProductIndex = raw.womenProductIndex;
    const alternativeProductIndex = raw.alternativeProductIndex;
    const rationale = raw.rationale;
    const matchedAttributes = stringList(raw.matchedAttributes, 12);
    const knownDifferences = stringList(raw.knownDifferences, 12);
    const confidence = raw.confidence;
    if (
      typeof womenProductIndex !== 'number' ||
      typeof alternativeProductIndex !== 'number' ||
      !Number.isSafeInteger(womenProductIndex) ||
      !Number.isSafeInteger(alternativeProductIndex) ||
      womenProductIndex === alternativeProductIndex ||
      !nonEmptyString(rationale, 1_000) ||
      !matchedAttributes ||
      !knownDifferences ||
      !['high', 'medium', 'low'].includes(String(confidence))
    ) {
      continue;
    }
    const women = products[womenProductIndex];
    const alternative = products[alternativeProductIndex];
    if (
      !women ||
      !alternative ||
      women.marketedTo !== 'women' ||
      !['men', 'neutral'].includes(alternative.marketedTo) ||
      women.category !== alternative.category ||
      !sameSize(women.size, alternative.size)
    ) {
      continue;
    }
    const pair = `${womenProductIndex}:${alternativeProductIndex}`;
    if (pairs.has(pair)) continue;
    pairs.add(pair);
    candidates.push({
      womenProductIndex,
      alternativeProductIndex,
      rationale,
      matchedAttributes,
      knownDifferences,
      confidence: confidence as ReviewCandidate['confidence'],
      requiresHumanReview: true,
    });
  }
  return candidates;
}
