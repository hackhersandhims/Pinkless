---
name: catalog-and-matcher
description: Use when writing or reviewing packages/catalog, packages/matcher, or apps/api/src/providers — product identity, reviewed women's→men's/neutral pairs, offer matching, and the Kroger provider are the product's trust boundary.
---

# Catalog and matcher

Applies to `packages/catalog/**`, `packages/matcher/**`, and
`apps/api/src/providers/**`. Product identity and reviewed equivalence are the
trust boundary (REQUIREMENTS §4). A product record documents one canonical
packaged item; a `ProductEquivalence` record documents why a women's product
and a men's or neutral product are comparable. Neither freezes a price. Treat
every rule here as a hard constraint.

## Money is always integer cents

- All monetary amounts are integer minor units (`amountCents`) in USD.
- **Never** use a floating-point value for money, anywhere, including
  intermediate arithmetic. Kroger returns dollars (`7.99`); `toCents` in the
  Kroger provider is the only conversion and rejects non-whole-cent values.

## Shared types (source of truth: `packages/catalog/src/schema.ts`)

```ts
type Money = { amountCents: number; currency: "USD" };
type Size = { amount: number; unit: "oz" | "ml" | "count" };

type RetailerIdentity = {
  retailer: "kroger";
  productId: string; // Kroger's 13-digit productId
  canonicalUrl: string;
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
  marketedTo: "women" | "men" | "neutral";
  identities: RetailerIdentity[];
  status: "active" | "paused" | "retired";
};

type ProductEquivalence = {
  id: string;
  productIds: [string, string]; // exactly one women's + one men's/neutral
  rationale: string;
  matchedAttributes: string[];
  knownDifferences: string[]; // non-empty
  reviewedBy: string;
  reviewedAt: string; // YYYY-MM-DD
  status: "active" | "paused" | "retired";
};

type Offer = {
  retailer: "kroger";
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
```

Don't resurrect the older `Comparison`/`TargetListing`/`AlternativeListing`
shapes or the per-product `equivalence` block. Don't add fields, loosen types,
or make required fields optional without updating `Files/REQUIREMENTS.md` in
the same PR.

## Catalog validation — every rejection rule

`pnpm run catalog:validate` checks `products.json` and `equivalences.json`:

- [ ] Duplicate product IDs, UPCs, retailer identities, or URL patterns.
- [ ] An `active` product without a Kroger identity; a missing `marketedTo`.
- [ ] Invalid sizes, URLs, or identity patterns.
- [ ] An equivalence that references a missing product, pairs a product with
      itself, or repeats a pair in either order.
- [ ] An equivalence that isn't exactly one `women` + one `men`/`neutral`
      product, crosses categories, or crosses size unit/amount.
- [ ] An active equivalence with an inactive product.
- [ ] Empty rationale or `knownDifferences`, or no reviewer / review date.

## Matching rules (REQUIREMENTS §5, `packages/matcher/src/compare.ts`)

1. Resolve an active product by, **in this order**: exact UPC, Kroger product
   ID, then canonical URL pattern. Title matching never produces a badge.
2. The page must report USD, `in-stock`, a positive price, a store price
   context (`in-store`/`store-pickup`), and a store `locationId`.
3. Only a **women's** product with an active reviewed pair to an active
   men's/neutral product is compared. Everything else is `no-match`.
4. The API prices both products from the provider at the **same store and
   price context**, using Kroger's **regular** price (never promo).
5. The page price is a consistency check only; if it differs from the
   provider's price for the current product → suppressed
   (`page-price-mismatch`).
6. Offers must be in stock, positive, USD, unexpired, and match the reviewed
   identity URL pattern.
7. Savings = women's price − men's/neutral price. Zero or negative →
   `no-match`.

## No auto-normalization

- No per-unit price normalization, no loyalty/membership prices, no pairing
  across sizes or categories.
- Being the same brand never makes two products equivalent. Every pair is
  written and reviewed by a person.

## Provider adapters (`apps/api/src/providers/**`)

- Kroger is the only provider, returning the shared `Offer` shape. Don't leak
  Kroger's response shape upward.
- `KROGER_CLIENT_ID`/`KROGER_CLIENT_SECRET` are server-only Vercel
  environment variables with the `product.compact` scope only. Never expose
  them to the extension or Marketplace; never use a `VITE_` prefix.
- Don't add another retailer or data source (including scraped-data services
  such as Canopy) without a REQUIREMENTS.md change.
- Fail closed: no credentials, ambiguous identity, no price, or unavailable →
  suppress, never a partial or invented price.
- `PINKLESS_PROVIDER_MODE=mock` selects deterministic fixtures
  (`apps/api/src/providers/mock-data.ts`); any other value uses the
  fail-closed live registry. Mock behavior belongs in the registry, not in the
  Kroger adapter.

## Determinism

Matching stays deterministic and reviewed. Never introduce fuzzy string
matching, embeddings, or an AI/LLM call to decide whether two products are
comparable or whether a badge should render.
