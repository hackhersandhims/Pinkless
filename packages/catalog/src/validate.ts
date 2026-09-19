import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EquivalencePolicy, Product, ProductAudience, Retailer, Size } from './schema.js';

export type ValidationIssue = { path: string; message: string };
export type ValidationResult = { valid: boolean; issues: ValidationIssue[] };

const categories = new Set<Product['category']>(['razors', 'deodorant', 'body-wash']);
const statuses = new Set<Product['status']>(['active', 'paused', 'retired']);
const audiences = new Set<ProductAudience>(['women', 'men', 'unisex']);
const sizeUnits = new Set<Size['unit']>(['oz', 'ml', 'count']);
const retailers = new Set<Retailer>(['amazon', 'cvs', 'kroger', 'walmart']);
const equivalencePolicies = new Set<EquivalencePolicy>(['exact-packaged-product']);

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
  amazon: 'amazon.com',
  cvs: 'cvs.com',
  kroger: 'kroger.com',
  walmart: 'walmart.com',
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
    issues.push({ path: `${path}.category`, message: 'must be razors, deodorant, or body-wash.' });
  }
  if (!audiences.has(value.audience as ProductAudience)) {
    issues.push({ path: `${path}.audience`, message: 'must be women, men, or unisex.' });
  }
  if (!statuses.has(value.status as Product['status'])) {
    issues.push({ path: `${path}.status`, message: 'must be active, paused, or retired.' });
  }
  validateSize(value.size, `${path}.size`, issues);

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
          message: 'must be amazon, cvs, kroger, or walmart.',
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

  if (
    value.status === 'active' &&
    !isNonEmptyString(value.upc) &&
    (!Array.isArray(identities) || identities.length === 0)
  ) {
    issues.push({
      path,
      message: 'active products need a UPC/GTIN or at least one canonical retailer identity.',
    });
  }

  if (!isRecord(value.equivalence)) {
    issues.push({ path: `${path}.equivalence`, message: 'must be an object.' });
  } else {
    if (!equivalencePolicies.has(value.equivalence.policy as EquivalencePolicy)) {
      issues.push({
        path: `${path}.equivalence.policy`,
        message: 'must use the supported exact-packaged-product policy.',
      });
    }
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

  if (!Array.isArray(value.reviewedAlternatives)) {
    issues.push({
      path: `${path}.reviewedAlternatives`,
      message: 'must be an array of explicit reviewed product links.',
    });
  } else {
    const seenAlternativeIds = new Set<string>();
    value.reviewedAlternatives.forEach((alternative, alternativeIndex) => {
      const alternativePath = `${path}.reviewedAlternatives[${alternativeIndex}]`;
      if (!isRecord(alternative)) {
        issues.push({ path: alternativePath, message: 'must be an object.' });
        return;
      }
      if (!isNonEmptyString(alternative.productId)) {
        issues.push({
          path: `${alternativePath}.productId`,
          message: 'must be a non-empty catalog product ID.',
        });
      } else {
        if (alternative.productId === value.id) {
          issues.push({
            path: `${alternativePath}.productId`,
            message: 'must not link to itself.',
          });
        }
        if (seenAlternativeIds.has(alternative.productId)) {
          issues.push({
            path: `${alternativePath}.productId`,
            message: `duplicates reviewed alternative "${alternative.productId}".`,
          });
        }
        seenAlternativeIds.add(alternative.productId);
      }
      if (!isNonEmptyString(alternative.rationale)) {
        issues.push({
          path: `${alternativePath}.rationale`,
          message: 'must be a non-empty string.',
        });
      }
      validateStringArray(
        alternative.matchedAttributes,
        `${alternativePath}.matchedAttributes`,
        issues,
      );
      if (alternative.knownDifferences !== undefined) {
        validateStringArray(
          alternative.knownDifferences,
          `${alternativePath}.knownDifferences`,
          issues,
        );
      }
    });
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

  const productsById = new Map<string, { product: Record<string, unknown>; index: number }>();
  value.forEach((product, index) => {
    if (isRecord(product) && isNonEmptyString(product.id)) {
      productsById.set(product.id, { product, index });
    }
  });
  value.forEach((source, sourceIndex) => {
    if (!isRecord(source) || !Array.isArray(source.reviewedAlternatives)) return;
    source.reviewedAlternatives.forEach((alternative, alternativeIndex) => {
      if (!isRecord(alternative) || !isNonEmptyString(alternative.productId)) return;
      const path = `[${sourceIndex}].reviewedAlternatives[${alternativeIndex}]`;
      const targetEntry = productsById.get(alternative.productId);
      if (!targetEntry) {
        issues.push({ path: `${path}.productId`, message: 'must reference an existing product.' });
        return;
      }
      const target = targetEntry.product;
      if (source.audience !== 'women' || target.audience !== 'men') {
        issues.push({
          path: `${path}.productId`,
          message: 'reviewed alternatives must link a women product to a men product.',
        });
      }
      if (target.status !== 'active') {
        issues.push({ path: `${path}.productId`, message: 'must reference an active product.' });
      }
      if (source.category !== target.category) {
        issues.push({ path: `${path}.productId`, message: 'must remain in the same category.' });
      }

      const sourceRetailers = new Set(
        Array.isArray(source.identities)
          ? source.identities.flatMap((identity) =>
              isRecord(identity) && isNonEmptyString(identity.retailer) ? [identity.retailer] : [],
            )
          : [],
      );
      const sharesRetailer =
        Array.isArray(target.identities) &&
        target.identities.some(
          (identity) =>
            isRecord(identity) &&
            isNonEmptyString(identity.retailer) &&
            sourceRetailers.has(identity.retailer),
        );
      if (!sharesRetailer) {
        issues.push({
          path: `${path}.productId`,
          message: 'must share at least one retailer identity with the source product.',
        });
      }

      const sourceSize = isRecord(source.size) ? source.size : undefined;
      const targetSize = isRecord(target.size) ? target.size : undefined;
      const sameSize =
        sourceSize?.amount === targetSize?.amount && sourceSize?.unit === targetSize?.unit;
      if (!sameSize && !Array.isArray(alternative.knownDifferences)) {
        issues.push({
          path: `${path}.knownDifferences`,
          message: 'must document a reviewed package-size difference.',
        });
      }
    });
  });

  return { valid: issues.length === 0, issues };
}

async function main(inputPath = process.argv[2] === '--' ? process.argv[3] : process.argv[2]) {
  const catalogPath = inputPath
    ? resolve(process.cwd(), inputPath)
    : fileURLToPath(new URL('../products.json', import.meta.url));
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as unknown;
  const result = validateCatalog(catalog);
  if (!result.valid) {
    console.error(`Catalog validation failed (${result.issues.length} issue(s)):`);
    result.issues.forEach((issue) => console.error(`- ${issue.path}: ${issue.message}`));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Catalog validation passed (${Array.isArray(catalog) ? catalog.length : 0} product records).`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
