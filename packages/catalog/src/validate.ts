import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MarketedTo, Product, ProductEquivalence, Retailer, Size } from './schema.js';

export type ValidationIssue = { path: string; message: string };
export type ValidationResult = { valid: boolean; issues: ValidationIssue[] };

// Mirrors CATEGORIES in schema.ts; this file runs under plain node, so it only imports types.
const CATEGORIES: readonly Product['category'][] = [
  'razors',
  'deodorant',
  'body-wash',
  'shave-care',
  'lotion',
  'face-care',
  'hair-care',
  'soap',
];
const categories = new Set<Product['category']>(CATEGORIES);
const statuses = new Set<Product['status']>(['active', 'paused', 'retired']);
const sizeUnits = new Set<Size['unit']>(['oz', 'ml', 'count']);
const audiences = new Set<MarketedTo>(['women', 'men', 'neutral']);
// Mirrors RETAILERS in schema.ts; this file runs under --experimental-strip-types, so it
// imports types only.
const retailers = new Set<Retailer>(['kroger']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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

function validateSize(value: unknown, path: string, issues: ValidationIssue[]): value is Size {
  if (!isRecord(value)) {
    issues.push({ path, message: 'must be an object with amount and unit.' });
    return false;
  }

  const validAmount =
    typeof value.amount === 'number' && Number.isFinite(value.amount) && value.amount > 0;
  if (!validAmount) {
    issues.push({ path: `${path}.amount`, message: 'must be a positive finite number.' });
  }

  const validUnit = sizeUnits.has(value.unit as Size['unit']);
  if (!validUnit) {
    issues.push({ path: `${path}.unit`, message: 'must be oz, ml, or count.' });
  }
  return validAmount && validUnit;
}

/** Validate a GTIN-8, UPC-A/GTIN-12, EAN/GTIN-13, or GTIN-14 check digit. */
function isValidGtin(value: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  for (let index = digits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += digits[index]! * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

const retailerDomains: Record<Retailer, string> = {
  kroger: 'kroger.com',
};

function validateUrlPattern(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  retailer?: Retailer,
): boolean {
  if (
    !isNonEmptyString(value) ||
    !value.startsWith('^https://') ||
    !value.endsWith('$') ||
    value.length > 512
  ) {
    issues.push({
      path,
      message: 'must be an anchored HTTPS regular expression of at most 512 characters.',
    });
    return false;
  }

  try {
    new RegExp(value);
  } catch {
    issues.push({ path, message: 'must be a valid regular expression.' });
    return false;
  }

  if (retailer && !value.replaceAll('\\.', '.').includes(retailerDomains[retailer])) {
    issues.push({
      path,
      message: `must target the canonical ${retailerDomains[retailer]} domain.`,
    });
    return false;
  }
  return true;
}

function validateCanonicalUrl(
  value: unknown,
  retailer: Retailer | undefined,
  path: string,
  issues: ValidationIssue[],
): URL | null {
  if (!isNonEmptyString(value)) {
    issues.push({ path, message: 'must be a non-empty HTTPS URL.' });
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    const hostname = url.hostname.toLowerCase();
    if (
      retailer &&
      hostname !== retailerDomains[retailer] &&
      !hostname.endsWith(`.${retailerDomains[retailer]}`)
    ) {
      issues.push({
        path,
        message: `must target the canonical ${retailerDomains[retailer]} domain.`,
      });
      return null;
    }
    return url;
  } catch {
    issues.push({ path, message: 'must be a valid HTTPS URL without credentials.' });
    return null;
  }
}

function patternMatchesUrl(pattern: string, url: URL): boolean {
  try {
    return new RegExp(pattern).test(url.href);
  } catch {
    return false;
  }
}

function validateProduct(value: unknown, index: number, issues: ValidationIssue[]): void {
  const path = `[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path, message: 'must be an object.' });
    return;
  }

  if (!isNonEmptyString(value.id)) {
    issues.push({ path: `${path}.id`, message: 'must be a non-empty string.' });
  }
  if (value.upc !== undefined && (!isNonEmptyString(value.upc) || !isValidGtin(value.upc))) {
    issues.push({
      path: `${path}.upc`,
      message: 'must be a valid GTIN-8, UPC-A, EAN-13, or GTIN-14.',
    });
  }
  if (!isNonEmptyString(value.name)) {
    issues.push({ path: `${path}.name`, message: 'must be a non-empty string.' });
  }
  if (value.brand !== undefined && !isNonEmptyString(value.brand)) {
    issues.push({ path: `${path}.brand`, message: 'must be a non-empty string when provided.' });
  }
  if (!isNonEmptyString(value.variant)) {
    issues.push({ path: `${path}.variant`, message: 'must be a non-empty string.' });
  }
  if (!categories.has(value.category as Product['category'])) {
    issues.push({ path: `${path}.category`, message: `must be one of: ${CATEGORIES.join(', ')}.` });
  }
  if (!statuses.has(value.status as Product['status'])) {
    issues.push({ path: `${path}.status`, message: 'must be active, paused, or retired.' });
  }
  validateSize(value.size, `${path}.size`, issues);
  if (!audiences.has(value.marketedTo as MarketedTo)) {
    issues.push({ path: `${path}.marketedTo`, message: 'must be women, men, or neutral.' });
  }

  const identities = value.identities;
  if (!Array.isArray(identities)) {
    issues.push({ path: `${path}.identities`, message: 'must be an array.' });
  } else {
    const seenRetailers = new Set<string>();
    identities.forEach((identity, identityIndex) => {
      const identityPath = `${path}.identities[${identityIndex}]`;
      if (!isRecord(identity)) {
        issues.push({ path: identityPath, message: 'must be an object.' });
        return;
      }
      if (!retailers.has(identity.retailer as Retailer)) {
        issues.push({
          path: `${identityPath}.retailer`,
          message: 'must be kroger.',
        });
      } else if (seenRetailers.has(identity.retailer as string)) {
        issues.push({
          path: `${identityPath}.retailer`,
          message: `duplicates retailer identity "${String(identity.retailer)}" for this product.`,
        });
      } else {
        seenRetailers.add(identity.retailer as string);
      }
      if (!isNonEmptyString(identity.productId)) {
        issues.push({ path: `${identityPath}.productId`, message: 'must be a non-empty string.' });
      }
      const retailer = retailers.has(identity.retailer as Retailer)
        ? (identity.retailer as Retailer)
        : undefined;
      const canonicalUrl = validateCanonicalUrl(
        identity.canonicalUrl,
        retailer,
        `${identityPath}.canonicalUrl`,
        issues,
      );
      if (
        validateStringArray(
          identity.canonicalUrlPatterns,
          `${identityPath}.canonicalUrlPatterns`,
          issues,
        )
      ) {
        identity.canonicalUrlPatterns.forEach((pattern, patternIndex) =>
          validateUrlPattern(
            pattern,
            `${identityPath}.canonicalUrlPatterns[${patternIndex}]`,
            issues,
            retailer,
          ),
        );
        if (
          canonicalUrl &&
          !identity.canonicalUrlPatterns.some((pattern) => patternMatchesUrl(pattern, canonicalUrl))
        ) {
          issues.push({
            path: `${identityPath}.canonicalUrl`,
            message: 'must match at least one canonical URL pattern for this identity.',
          });
        }
      }
    });
  }

  // A UPC alone can't be priced: the provider looks products up by Kroger productId.
  if (value.status === 'active' && (!Array.isArray(identities) || identities.length === 0)) {
    issues.push({ path, message: 'active products need a canonical Kroger identity.' });
  }
}

export function validateCatalog(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(value)) {
    return { valid: false, issues: [{ path: '$', message: 'catalog must be a JSON array.' }] };
  }

  const seenIds = new Set<string>();
  const seenUpcs = new Set<string>();
  const seenRetailerProducts = new Set<string>();
  const seenCanonicalPatterns = new Set<string>();
  value.forEach((product, index) => {
    validateProduct(product, index, issues);
    if (!isRecord(product)) return;

    if (isNonEmptyString(product.id)) {
      if (seenIds.has(product.id)) {
        issues.push({ path: `[${index}].id`, message: `duplicates product ID "${product.id}".` });
      }
      seenIds.add(product.id);
    }
    if (isNonEmptyString(product.upc)) {
      if (seenUpcs.has(product.upc)) {
        issues.push({ path: `[${index}].upc`, message: `duplicates UPC/GTIN "${product.upc}".` });
      }
      seenUpcs.add(product.upc);
    }
    if (Array.isArray(product.identities)) {
      product.identities.forEach((identity, identityIndex) => {
        if (
          !isRecord(identity) ||
          !isNonEmptyString(identity.retailer) ||
          !isNonEmptyString(identity.productId)
        )
          return;
        const key = `${identity.retailer}:${identity.productId}`;
        if (seenRetailerProducts.has(key)) {
          issues.push({
            path: `[${index}].identities[${identityIndex}].productId`,
            message: `duplicates retailer product identity "${key}".`,
          });
        }
        seenRetailerProducts.add(key);
        if (Array.isArray(identity.canonicalUrlPatterns)) {
          identity.canonicalUrlPatterns.forEach((pattern, patternIndex) => {
            if (!isNonEmptyString(pattern)) return;
            if (seenCanonicalPatterns.has(pattern)) {
              issues.push({
                path: `[${index}].identities[${identityIndex}].canonicalUrlPatterns[${patternIndex}]`,
                message: 'duplicates a canonical URL pattern from another product identity.',
              });
            }
            seenCanonicalPatterns.add(pattern);
          });
        }
      });
    }
  });

  return { valid: issues.length === 0, issues };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate reviewed equivalence pairs against a product list (REQUIREMENTS §4).
 * A pair links two different, existing products of the same category and
 * size unit. Amounts may differ: savings are then compared per unit (see
 * packages/matcher/src/unit-price.ts).
 */
export function validateEquivalences(value: unknown, products: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(value)) {
    return {
      valid: false,
      issues: [{ path: '$', message: 'equivalences must be a JSON array.' }],
    };
  }
  const byId = new Map<string, Product>();
  if (Array.isArray(products)) {
    for (const product of products) {
      if (isRecord(product) && isNonEmptyString(product.id)) {
        byId.set(product.id, product as Product);
      }
    }
  }

  const seenIds = new Set<string>();
  const seenPairs = new Set<string>();
  value.forEach((entry, index) => {
    const path = `[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ path, message: 'must be an object.' });
      return;
    }
    if (!isNonEmptyString(entry.id)) {
      issues.push({ path: `${path}.id`, message: 'must be a non-empty string.' });
    } else if (seenIds.has(entry.id)) {
      issues.push({ path: `${path}.id`, message: `duplicates equivalence ID "${entry.id}".` });
    } else {
      seenIds.add(entry.id);
    }
    if (!statuses.has(entry.status as ProductEquivalence['status'])) {
      issues.push({ path: `${path}.status`, message: 'must be active, paused, or retired.' });
    }
    if (!isNonEmptyString(entry.rationale)) {
      issues.push({ path: `${path}.rationale`, message: 'must be a non-empty string.' });
    }
    validateStringArray(entry.matchedAttributes, `${path}.matchedAttributes`, issues);
    validateStringArray(entry.knownDifferences, `${path}.knownDifferences`, issues);
    if (!isNonEmptyString(entry.reviewedBy)) {
      issues.push({ path: `${path}.reviewedBy`, message: 'must name the reviewer.' });
    }
    if (
      !isNonEmptyString(entry.reviewedAt) ||
      !ISO_DATE.test(entry.reviewedAt) ||
      !Number.isFinite(Date.parse(entry.reviewedAt))
    ) {
      issues.push({ path: `${path}.reviewedAt`, message: 'must be an ISO date (YYYY-MM-DD).' });
    }

    const ids = entry.productIds;
    if (!Array.isArray(ids) || ids.length !== 2 || !ids.every(isNonEmptyString)) {
      issues.push({ path: `${path}.productIds`, message: 'must list exactly two product IDs.' });
      return;
    }
    const [leftId, rightId] = ids as [string, string];
    if (leftId === rightId) {
      issues.push({ path: `${path}.productIds`, message: 'must pair two different products.' });
      return;
    }
    const pairKey = [leftId, rightId].sort().join('|');
    if (seenPairs.has(pairKey)) {
      issues.push({ path: `${path}.productIds`, message: 'duplicates an existing pair.' });
    }
    seenPairs.add(pairKey);

    const left = byId.get(leftId);
    const right = byId.get(rightId);
    ids.forEach((id, idIndex) => {
      if (!byId.has(id as string)) {
        issues.push({
          path: `${path}.productIds[${idIndex}]`,
          message: `references unknown product "${String(id)}".`,
        });
      }
    });
    if (!left || !right) return;

    if (entry.status === 'active' && (left.status !== 'active' || right.status !== 'active')) {
      issues.push({ path, message: 'an active equivalence needs two active products.' });
    }
    const womens = [left, right].filter((product) => product.marketedTo === 'women');
    if (womens.length !== 1) {
      issues.push({
        path,
        message: "must pair exactly one women's product with a men's or neutral product.",
      });
    }
    if (left.category !== right.category) {
      issues.push({ path, message: 'must pair products in the same category.' });
    }
    if (isRecord(left.size) && isRecord(right.size) && left.size.unit !== right.size.unit) {
      issues.push({ path, message: 'must pair products with the same size unit.' });
    }
  });

  return { valid: issues.length === 0, issues };
}

async function main(argv = process.argv.slice(2).filter((arg) => arg !== '--')) {
  const productsPath = argv[0]
    ? resolve(process.cwd(), argv[0])
    : fileURLToPath(new URL('../products.json', import.meta.url));
  const equivalencesPath = argv[1]
    ? resolve(process.cwd(), argv[1])
    : fileURLToPath(new URL('../equivalences.json', import.meta.url));
  const products = JSON.parse(await readFile(productsPath, 'utf8')) as unknown;
  const equivalences = JSON.parse(await readFile(equivalencesPath, 'utf8')) as unknown;
  const issues = [
    ...validateCatalog(products).issues.map((issue) => ({
      ...issue,
      path: `products${issue.path}`,
    })),
    ...validateEquivalences(equivalences, products).issues.map((issue) => ({
      ...issue,
      path: `equivalences${issue.path}`,
    })),
  ];
  if (issues.length > 0) {
    console.error(`Catalog validation failed (${issues.length} issue(s)):`);
    issues.forEach((issue) => console.error(`- ${issue.path}: ${issue.message}`));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Catalog validation passed (${Array.isArray(products) ? products.length : 0} products, ${
      Array.isArray(equivalences) ? equivalences.length : 0
    } equivalences).`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
