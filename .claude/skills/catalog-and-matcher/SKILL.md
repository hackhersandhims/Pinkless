---
name: catalog-and-matcher
description: Use when writing or reviewing packages/catalog, packages/matcher, or apps/api/src/providers — product identity, offer matching, and provider adapters are the product's trust boundary.
---

# Catalog and matcher

Applies to `packages/catalog/**`, `packages/matcher/**`, and
`apps/api/src/providers/**`. Product identity is the trust boundary
(REQUIREMENTS §4) — a product record documents a canonical packaged item and
approved equivalence policy; it does not freeze a retailer price. Treat every
rule here as a hard constraint.

## Money is always integer cents

- All monetary amounts are integer minor units (`amountCents`) in USD.
- **Never** use a floating-point value for money, anywhere, including
  intermediate arithmetic. Flag any PR that introduces float pricing.

## Exact shared types (REQUIREMENTS §4/§5)

```ts
type Money = { amountCents: number; currency: "USD" };
type Size = { amount: number; unit: "oz" | "ml" | "count" };

type RetailerIdentity = {
  retailer: string;
  productId: string;
  canonicalUrlPatterns: string[];
};

type Product = {
  id: string;
  upc?: string;
  name: string;
  brand?: string;
  variant: string;
  category: "razors" | "deodorant" | "body-wash";
  size: Size;
  identities: RetailerIdentity[];
  equivalence: {
    rationale: string;
    matchedAttributes: string[];
    knownDifferences?: string[];
  };
  status: "active" | "paused" | "retired";
};

type Offer = {
  retailer: string;
  productId: string;
  url: string;
  price: Money;
  priceContext: "online" | "store-pickup" | "in-store";
  condition: "new";
  availability: "in-stock" | "out-of-stock" | "unknown";
  locationId?: string;
  observedAt: string; // ISO date-time
  expiresAt: string; // ISO date-time
};

type ProductView = {
  retailer: string;
  canonicalUrl: string;
  productId?: string;
  upc?: string;
  title: string;
  selectedVariant?: string;
  currentPriceCents?: number;
  currency?: string;
  availability: "in-stock" | "out-of-stock" | "unknown";
};
```

`Product`/`Offer`/`RetailerIdentity` replaced the older `Comparison`/
`TargetListing`/`AlternativeListing` shapes — don't resurrect those. Don't add
fields, loosen types, or make required fields optional without updating
`Files/REQUIREMENTS.md` in the same PR.

## Catalog validation — every rejection rule

`packages/catalog` validation must reject a record for any of these:

- [ ] Duplicate product IDs or UPCs.
- [ ] An `active` record without a canonical identity (a `RetailerIdentity`).
- [ ] Empty `equivalence.rationale`.
- [ ] Invalid sizes, money, URLs, or identity patterns.
- [ ] A duplicate retailer identity on the same product.
- [ ] Identities that would connect incompatible packaged quantities.

## Matching rules (REQUIREMENTS §5)

1. Resolve an active product by, **in this order**: exact UPC, retailer
   product ID, then canonical URL pattern. Title/category matching may help a
   human diagnose a mismatch during review, but must never independently
   produce a badge.
2. The page must report USD, `in-stock` availability, and a positive price
   before the matcher proceeds.
3. The selected page variant must be compatible with the canonical product.
4. Request candidate offers **only** from approved retailer providers — the
   matcher/extension never invents or scrapes an offer itself.
5. Compare the current offer only against **in-stock, positive, unexpired**
   offers in the **same price context** (`online` / `store-pickup` /
   `in-store`). Never compare an online price to a store-specific price as if
   they were equivalent.
6. Zero or negative savings → `no-match`, not a badge with $0.00 savings.
7. Return a display model only once every check above passes.

## No auto-normalization

- The matcher does not normalize price per unit automatically, does not
  compare membership-only prices, and does not treat a same-brand product as
  an automatic exact match.
- Quantity-different products are suppressed unless an explicit reviewed
  equivalence policy (in `knownDifferences`) permits the comparison.

## Provider adapters (`apps/api/src/providers/**`)

- One adapter per retailer (Kroger, CVS, Walmart), each returning the shared
  `Offer` shape — don't let a provider leak its own response shape upward.
- Retailer credentials (`KROGER_CLIENT_ID`/`KROGER_CLIENT_SECRET`, etc.) are
  server-only Vercel environment variables. Never expose them to the
  extension or Marketplace, and never use a client-visible `VITE_` prefix for
  them.
- CVS and Walmart currently accept **no** environment credentials — their
  provider shells must reject every lookup until an approved/licensed
  integration exists. Don't wire in an ad hoc key to "make it work."
- Fail closed: no approved credentials, ambiguous identity, no price, or
  unavailable → suppress that retailer's offer, never a partial or invented
  price.
- `PINKLESS_PROVIDER_MODE=mock` selects deterministic local fixtures (under
  `fixtures/providers/`); any other value uses the fail-closed live registry.
  Don't special-case mock behavior inside a provider adapter itself — it
  belongs in the registry/mode switch.

## Determinism

Matching stays deterministic and reviewed. Never introduce fuzzy string
matching, embeddings, or an AI/LLM call as a basis for deciding whether two
products are comparable or whether a badge should render.
