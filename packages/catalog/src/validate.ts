import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Comparison, Money, Size } from './schema.js';

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

const categories = new Set<Comparison['category']>(['razors', 'deodorant', 'body-wash']);
const statuses = new Set<Comparison['status']>(['active', 'paused', 'retired']);
const marketingLabels = new Set<Comparison['target']['marketedAs']>(['women', 'men', 'unisex']);
const sizeUnits = new Set<Size['unit']>(['oz', 'ml', 'count']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isIsoDate(value: unknown): value is string {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function validateMoney(value: unknown, path: string, issues: ValidationIssue[]): value is Money {
  if (!isRecord(value)) {
    issues.push({ path, message: 'must be an object with amountCents and USD currency.' });
    return false;
  }

  const amountCents = value.amountCents;
  if (typeof amountCents !== 'number' || !Number.isSafeInteger(amountCents) || amountCents <= 0) {
    issues.push({
      path: `${path}.amountCents`,
      message: 'must be a positive integer number of cents.',
    });
  }

  if (value.currency !== 'USD') {
    issues.push({ path: `${path}.currency`, message: 'must be USD.' });
  }

  return (
    typeof amountCents === 'number' &&
    Number.isSafeInteger(amountCents) &&
    amountCents > 0 &&
    value.currency === 'USD'
  );
}

function validateSize(value: unknown, path: string, issues: ValidationIssue[]): value is Size {
  if (!isRecord(value)) {
    issues.push({ path, message: 'must be an object with amount and unit.' });
    return false;
  }

  if (!isPositiveFiniteNumber(value.amount)) {
    issues.push({ path: `${path}.amount`, message: 'must be a positive finite number.' });
  }

  if (!sizeUnits.has(value.unit as Size['unit'])) {
    issues.push({ path: `${path}.unit`, message: 'must be oz, ml, or count.' });
  }

  return isPositiveFiniteNumber(value.amount) && sizeUnits.has(value.unit as Size['unit']);
}

function validateUrlPattern(value: unknown, path: string, issues: ValidationIssue[]): boolean {
  if (!isNonEmptyString(value) || !value.startsWith('^')) {
    issues.push({ path, message: 'must be a non-empty, anchored regular expression.' });
    return false;
  }

  try {
    new RegExp(value);
    return true;
  } catch {
    issues.push({ path, message: 'must be a valid regular expression.' });
    return false;
  }
}

function validateStringArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isNonEmptyString)) {
    issues.push({ path, message: 'must be a non-empty array of non-empty strings.' });
    return false;
  }

  return true;
}

function validateComparison(value: unknown, index: number, issues: ValidationIssue[]): void {
  const path = `[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path, message: 'must be an object.' });
    return;
  }

  if (!isNonEmptyString(value.id)) {
    issues.push({ path: `${path}.id`, message: 'must be a non-empty string.' });
  }

  if (!categories.has(value.category as Comparison['category'])) {
    issues.push({ path: `${path}.category`, message: 'must be razors, deodorant, or body-wash.' });
  }

  if (!statuses.has(value.status as Comparison['status'])) {
    issues.push({ path: `${path}.status`, message: 'must be active, paused, or retired.' });
  }

  let targetPrice: Money | undefined;
  let targetSize: Size | undefined;
  if (!isRecord(value.target)) {
    issues.push({ path: `${path}.target`, message: 'must be an object.' });
  } else {
    if (!isNonEmptyString(value.target.retailer)) {
      issues.push({ path: `${path}.target.retailer`, message: 'must be a non-empty string.' });
    }
    if (!isNonEmptyString(value.target.name)) {
      issues.push({ path: `${path}.target.name`, message: 'must be a non-empty string.' });
    }
    if (!isNonEmptyString(value.target.variant)) {
      issues.push({ path: `${path}.target.variant`, message: 'must be a non-empty string.' });
    }
    if (!marketingLabels.has(value.target.marketedAs as Comparison['target']['marketedAs'])) {
      issues.push({ path: `${path}.target.marketedAs`, message: 'must be women, men, or unisex.' });
    }
    targetPrice = validateMoney(value.target.price, `${path}.target.price`, issues)
      ? value.target.price
      : undefined;
    targetSize = validateSize(value.target.size, `${path}.target.size`, issues)
      ? value.target.size
      : undefined;

    const canonicalUrlPatterns = value.target.canonicalUrlPatterns;
    const patternsValid = validateStringArray(
      canonicalUrlPatterns,
      `${path}.target.canonicalUrlPatterns`,
      issues,
    );
    if (patternsValid) {
      canonicalUrlPatterns.forEach((pattern, patternIndex) => {
        validateUrlPattern(pattern, `${path}.target.canonicalUrlPatterns[${patternIndex}]`, issues);
      });
    }

    if (
      value.status === 'active' &&
      !isNonEmptyString(value.target.productId) &&
      (!Array.isArray(value.target.canonicalUrlPatterns) ||
        value.target.canonicalUrlPatterns.length === 0)
    ) {
      issues.push({
        path: `${path}.target`,
        message: 'active records need a productId or canonical URL pattern.',
      });
    }
  }

  let alternativePrice: Money | undefined;
  let alternativeSize: Size | undefined;
  if (!isRecord(value.alternative)) {
    issues.push({ path: `${path}.alternative`, message: 'must be an object.' });
  } else {
    if (!isNonEmptyString(value.alternative.retailer)) {
      issues.push({ path: `${path}.alternative.retailer`, message: 'must be a non-empty string.' });
    }
    if (!isNonEmptyString(value.alternative.name)) {
      issues.push({ path: `${path}.alternative.name`, message: 'must be a non-empty string.' });
    }
    if (!isValidHttpUrl(value.alternative.url)) {
      issues.push({ path: `${path}.alternative.url`, message: 'must be a valid HTTP(S) URL.' });
    }
    if (value.alternative.condition !== 'new') {
      issues.push({ path: `${path}.alternative.condition`, message: 'must be new.' });
    }
    if (value.alternative.availability !== 'verified-in-stock') {
      issues.push({
        path: `${path}.alternative.availability`,
        message: 'must be verified-in-stock.',
      });
    }
    alternativePrice = validateMoney(value.alternative.price, `${path}.alternative.price`, issues)
      ? value.alternative.price
      : undefined;
    alternativeSize = validateSize(value.alternative.size, `${path}.alternative.size`, issues)
      ? value.alternative.size
      : undefined;
  }

  if (targetSize && alternativeSize && targetSize.unit !== alternativeSize.unit) {
    issues.push({
      path: `${path}.alternative.size.unit`,
      message: `must match target size unit (${targetSize.unit}).`,
    });
  }

  if (
    value.status === 'active' &&
    targetPrice &&
    alternativePrice &&
    alternativePrice.amountCents >= targetPrice.amountCents
  ) {
    issues.push({
      path: `${path}.alternative.price.amountCents`,
      message: 'must be lower than the recorded target price for an active record.',
    });
  }

  if (!isRecord(value.equivalence)) {
    issues.push({ path: `${path}.equivalence`, message: 'must be an object.' });
  } else {
    if (!isNonEmptyString(value.equivalence.rationale)) {
      issues.push({
        path: `${path}.equivalence.rationale`,
        message: 'must be a non-empty string.',
      });
    }
    validateStringArray(
      value.equivalence.matchedAttributes,
      `${path}.equivalence.matchedAttributes`,
      issues,
    );
    if (value.equivalence.knownDifferences !== undefined) {
      validateStringArray(
        value.equivalence.knownDifferences,
        `${path}.equivalence.knownDifferences`,
        issues,
      );
    }
  }

  if (!isRecord(value.evidence)) {
    issues.push({ path: `${path}.evidence`, message: 'must be an object.' });
  } else {
    if (!isIsoDate(value.evidence.verifiedAt)) {
      issues.push({
        path: `${path}.evidence.verifiedAt`,
        message: 'must be a valid ISO date (YYYY-MM-DD).',
      });
    }
    const sourceUrls = value.evidence.sourceUrls;
    const sourcesValid = validateStringArray(sourceUrls, `${path}.evidence.sourceUrls`, issues);
    if (sourcesValid) {
      sourceUrls.forEach((url, sourceIndex) => {
        if (!isValidHttpUrl(url)) {
          issues.push({
            path: `${path}.evidence.sourceUrls[${sourceIndex}]`,
            message: 'must be a valid HTTP(S) URL.',
          });
        }
      });
    }
  }
}

export function validateCatalog(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(value)) {
    return { valid: false, issues: [{ path: '$', message: 'catalog must be a JSON array.' }] };
  }

  const seenIds = new Set<string>();
  value.forEach((comparison, index) => {
    validateComparison(comparison, index, issues);

    if (isRecord(comparison) && isNonEmptyString(comparison.id)) {
      if (seenIds.has(comparison.id)) {
        issues.push({
          path: `[${index}].id`,
          message: `duplicates comparison ID "${comparison.id}".`,
        });
      }
      seenIds.add(comparison.id);
    }
  });

  return { valid: issues.length === 0, issues };
}

async function main(
  inputPath = process.argv[2] === '--' ? process.argv[3] : process.argv[2],
): Promise<void> {
  const catalogPath = inputPath
    ? resolve(process.cwd(), inputPath)
    : fileURLToPath(new URL('../comparisons.json', import.meta.url));
  const source = await readFile(catalogPath, 'utf8');
  const catalog = JSON.parse(source);
  const result = validateCatalog(catalog);

  if (!result.valid) {
    console.error(`Catalog validation failed (${result.issues.length} issue(s)):`);
    result.issues.forEach((issue) => console.error(`- ${issue.path}: ${issue.message}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Catalog validation passed (${catalog.length} comparison records).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
