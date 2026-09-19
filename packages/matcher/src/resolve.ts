import type { Product, RetailerIdentity } from '../../catalog/src/schema.js';
import type { IdentityMatchMethod, ProductView } from './types.js';

export type ProductResolution =
  | { status: 'matched'; product: Product; matchedBy: IdentityMatchMethod }
  | { status: 'no-match' }
  | { status: 'conflict'; kind: 'identity-conflict' | 'variant-conflict' };

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function urlMatches(identity: RetailerIdentity, canonicalUrl: string): boolean {
  return identity.canonicalUrlPatterns.some((pattern) => {
    try {
      return new RegExp(pattern).test(canonicalUrl);
    } catch {
      return false;
    }
  });
}

function uniqueProduct(matches: Product[]): Product | 'conflict' | null {
  const unique = [...new Map(matches.map((product) => [product.id, product])).values()];
  if (unique.length > 1) return 'conflict';
  return unique[0] ?? null;
}

export function resolveProduct(products: Product[], view: ProductView): ProductResolution {
  const active = products.filter((product) => product.status === 'active');
  const upcMatch = view.upc
    ? uniqueProduct(active.filter((product) => product.upc === view.upc))
    : null;
  const productIdMatch = view.productId
    ? uniqueProduct(
        active.filter((product) =>
          product.identities.some(
            (identity) =>
              identity.retailer === view.retailer && identity.productId === view.productId,
          ),
        ),
      )
    : null;
  const urlMatch = uniqueProduct(
    active.filter((product) =>
      product.identities.some(
        (identity) =>
          identity.retailer === view.retailer && urlMatches(identity, view.canonicalUrl),
      ),
    ),
  );

  if (upcMatch === 'conflict' || productIdMatch === 'conflict' || urlMatch === 'conflict') {
    return { status: 'conflict', kind: 'identity-conflict' };
  }

  const selected = upcMatch ?? productIdMatch ?? urlMatch;
  if (!selected) return { status: 'no-match' };

  for (const match of [upcMatch, productIdMatch, urlMatch]) {
    if (match && match.id !== selected.id) {
      return { status: 'conflict', kind: 'identity-conflict' };
    }
  }

  const retailerIdentity = selected.identities.find(
    (identity) => identity.retailer === view.retailer,
  );
  if (view.upc && selected.upc && view.upc !== selected.upc) {
    return { status: 'conflict', kind: 'identity-conflict' };
  }
  if (view.productId && retailerIdentity && view.productId !== retailerIdentity.productId) {
    return { status: 'conflict', kind: 'identity-conflict' };
  }
  if (retailerIdentity && !urlMatches(retailerIdentity, view.canonicalUrl)) {
    return { status: 'conflict', kind: 'identity-conflict' };
  }
  if (view.selectedVariant && normalized(view.selectedVariant) !== normalized(selected.variant)) {
    return { status: 'conflict', kind: 'variant-conflict' };
  }

  const matchedBy: IdentityMatchMethod = upcMatch
    ? 'upc'
    : productIdMatch
      ? 'retailer-product-id'
      : 'canonical-url';
  return { status: 'matched', product: selected, matchedBy };
}
