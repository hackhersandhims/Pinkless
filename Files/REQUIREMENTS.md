# Pinkless — Build Requirements

## 1. Product decision

Pinkless is a Chrome extension and companion Marketplace that compare a
product at the point of shopping across supported retailers. The first live
comparison network is **CVS, Kroger, and Walmart**. It must only flag an
offer when it finds an exact product match (preferably UPC/GTIN) with a
verified lower price at another supported retailer.

The first release is a hackathon demo, not an automated system for judging
whether a price is discriminatory. Its user-facing promise is:

> We found the same verified product at a lower price from a supported
> retailer when last checked.

Silence is the default. A weak keyword match, unknown price, unavailable
alternative, or non-positive savings must not produce a badge.

## 2. MVP scope

### In scope

- Three supported retailers: CVS, Kroger, and Walmart.
- Exact packaged-product comparisons across those retailers, starting with
  razors and expanding only when matching quality is proven.
- Chrome Manifest V3 extension, loadable unpacked.
- Product title, UPC/GTIN when present, current price, selected variant,
  canonical URL/product ID, and availability extraction from the current page.
- A non-intrusive in-page badge that shows the savings and a concise matching
  rationale.
- A click-through to the alternative retailer listing or its Marketplace detail
  page.
- A Vercel-deployed Marketplace with comparison cards, explanation, freshness
  data, and outbound links.
- A controlled fallback demo page for judging if a retailer changes its DOM or
  inventory during the event.

### Explicitly out of scope

- Scraping retailer pages or calling undocumented retailer endpoints.
- Accounts, saved preferences, payment, checkout, affiliates, or user tracking.
- Claims that a retailer or item is legally discriminatory.
- A recommendation produced solely by AI or fuzzy keyword matching.
- Price tracking, personal savings history, community submissions, and browser
  support beyond Chrome.

## 3. Technical architecture

```text
apps/extension/           Chrome MV3 content script and popup
         |
         | product identity + selected store (no credentials)
         v
apps/api/                 Vercel serverless API: orchestration, caching,
                           rate limiting, and retailer credentials
         |
         +--> KrogerAdapter       official product/location API
         +--> CvsAdapter          approved CVS partner/licensed data API
         +--> WalmartAdapter      approved Walmart product/price data API
         |
         v
packages/matcher/         pure identity, eligibility, offer, and money logic
packages/catalog/         product metadata, reviewed equivalence policy, and
                           fixtures (not live prices)
         |
         +--> apps/marketplace/   Vercel-deployed React site
```

### Repository structure

```text
pinkless/
  apps/
    extension/
      manifest.json
      src/content/
      src/popup/
      src/adapters/
    api/
      src/providers/
      src/routes/
    marketplace/
      src/
  packages/
    catalog/
      products.json
      schema.ts
      validate.ts
    matcher/
      src/
  fixtures/
    retailers/
  REQUIREMENTS.md
  TASKS.md
```

### Extension responsibilities

1. Run a content script only on declared CVS, Kroger, and Walmart domains.
2. Let a page adapter extract a normalized `ProductView` from the current page.
3. Send the minimum needed identity and selected store context to the API.
4. Render eligible cross-retailer offers returned by the API in one Shadow DOM
   root.
5. Re-evaluate with a debounced `MutationObserver` when a product page changes
   variants or navigates client-side.

The extension must not contain retailer credentials or request an arbitrary
page history. It may send the current product identity and selected retailer
location to the Pinkless API solely to obtain a comparison.

### API responsibilities

- Keep all retailer credentials in Vercel environment variables; never expose
  them to the extension or Marketplace.
- Use one provider adapter per retailer and return a shared normalized `Offer`.
- Cache by `retailer + product ID/UPC + location + fulfillment method`, with an
  observation timestamp and provider-specific TTL/rate limit.
- Distinguish online and store-specific prices. Never present an online price
  as a local-store price or compare unlike fulfillment contexts as if they were
  equivalent.
- Fail closed when a provider has no approved credentials, returns ambiguous
  identity, lacks a price, or is unavailable.

### Provider configuration

- `PINKLESS_PROVIDER_MODE=mock` enables deterministic local CVS, Kroger, and
  Walmart fixtures. Any other value uses the fail-closed live registry.
- `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET` are server-only credentials for
  Kroger's OAuth client-credentials flow. They must be configured in Vercel and
  must never use the client-visible `VITE_` prefix.
- CVS and Walmart accept no environment credentials until their approved or
  licensed product-and-price integrations are implemented. Their provider
  shells reject every lookup in the meantime.
- `.env.example` documents variable names only. `.env` and `.env.*` files are
  ignored so credentials cannot be committed accidentally.

### Marketplace responsibilities

- Deploy on Vercel and call the same read-only comparison API as the extension.
- Show a category index, comparison cards, retailer/source, price date,
  equivalence rationale, and outbound link.
- Remain usable with JavaScript enabled on current desktop browsers.
- Have no login, checkout, or user tracking.

### Recommended implementation stack

- **TypeScript** for extension, matcher, catalog validation, and Marketplace.
- **React + Vite** for the Marketplace, deployed on Vercel, plus Vercel
  serverless functions for the comparison API.
- **Vite-based extension build** (or a small direct MV3 setup) that emits an
  unpacked Chrome extension.
- **JSON** for product identity/equivalence policy and fixtures, validated
  during development and CI. Live offers are server-fetched and cached.
- **Plain CSS** for the injected badge to minimize extension build complexity;
  use a Shadow DOM to isolate it from retailer styles.

## 4. Product identity and offer requirements

Product identity is the trust boundary. A product record documents a canonical
packaged item and approved equivalence policy; it does not freeze a retailer
price. The matcher must use an exact UPC/GTIN where available. A retailer SKU
or canonical URL may identify the product on a page, but title matching alone
must never independently produce a badge.

All monetary amounts are integer minor units (`priceCents` in USD). Never use
floating-point values for money.

```ts
type Money = {
  amountCents: number;
  currency: "USD";
};

type Size = {
  amount: number;
  unit: "oz" | "ml" | "count";
};

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
```

Catalog validation must reject:

- duplicate product IDs or UPCs;
- active records without a canonical identity;
- empty equivalence rationale;
- invalid sizes, money, URLs, or identity patterns;
- duplicate retailer identity per product;
- identities that would connect incompatible packaged quantities.

## 5. Matching and savings rules

`ProductView` is the normalized result from a retailer adapter:

```ts
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

The matcher must:

1. Resolve an active product by exact UPC, retailer product ID, or canonical URL
   pattern, in that order.
2. Ensure the page reports USD, an in-stock product, and a positive price.
3. Ensure the selected page variant is compatible with the canonical product.
4. Request candidate offers only from approved retailer providers.
5. Compare the current offer only with in-stock, positive, unexpired offers in
   the same price context.
6. Return `no-match` if savings are zero or negative.
7. Return a display model only if all checks pass.

The first version must not normalize price per unit automatically, compare
membership-only prices, or treat a same-brand product as an exact match. If
products differ in quantity, the comparison is suppressed unless an explicit
reviewed equivalence policy permits it.

## 6. Extension UX requirements

### Badge content

- Headline: `Comparable alternative: save $X.XX`
- Supporting text: short reviewed rationale, for example: `Both are 5-blade,
  single-handle razors; alternative was verified on Sep 18.`
- Primary action: `See alternative`
- Secondary disclosure: `Why this was matched`
- Optional dismiss control: `Not now`

### Behaviour and accessibility

- Do not render until product identity and price are valid.
- Render only once, even after DOM mutations or SPA navigation.
- Remove or update the badge when the selected variant changes.
- Do not obscure a price, checkout control, or native accessibility element.
- All controls work with keyboard and have descriptive labels.
- Do not use an assertive live region or steal focus.
- The primary action opens the catalog’s known outbound URL in a new tab.
- A dismiss action suppresses the current page only; persistent settings are not
  required for MVP.

## 7. Edge-case policy

| Situation | Required behaviour |
| --- | --- |
| Sale, coupon, membership, subscription, or “from” price | Suppress unless both offers identify equivalent ordinary one-time purchasable prices. |
| Price range or unparseable currency | Suppress. |
| Current price is at or below alternative price | Suppress. |
| Different size, refill, bundle, condition, or pack count | Suppress unless a reviewed catalog record explicitly covers it. |
| Current product or alternative offer is out of stock | Suppress. |
| One offer is online and the other is store-specific | Suppress rather than imply an equivalent local-store price. |
| CVS or Walmart credentials/data access are unavailable | Suppress that retailer; return no partial or invented price. |
| Third-party marketplace seller | Exclude from the initial catalog. |
| Page is an ad, search result, category page, or quick-view modal | Suppress. |
| Retailer changes DOM / extracted data is incomplete | Suppress, log a development-only diagnostic, rely on fallback demo page. |
| Client-side route/variant change | Debounce and recompute; never leave stale savings visible. |
| Duplicate/injected UI collision | Use a fixed unique root ID and Shadow DOM; replace rather than append. |
| Cached offer is expired | Revalidate through the provider; suppress it if refresh fails. |
| Gender marketing is ambiguous | Do not publish the comparison until reviewer documents the rationale. |

## 8. Quality gates and acceptance criteria

The demo is ready only when all of the following are true:

- A known supported product shows one correct badge in under three seconds on a warm cache.
- Its savings equal `current offer price - eligible alternative offer price` exactly.
- Clicking the badge opens the expected alternative URL.
- An unknown product, a non-product page, an unavailable item, and a product
  with no positive savings remain quiet.
- Changing a supported product variant updates or removes the badge correctly.
- The Marketplace identifies the source retailer, price context, and observed time for each displayed offer.
- Product-identity catalog validation runs cleanly before a build.
- Fixture-based tests cover every retailer adapter and the matcher’s key
  suppression rules.
- The unpacked extension and Vercel Marketplace use only the Pinkless API and approved retailer connections; no page scraping is used.

## 9. Deferred production work

After the first three-retailer release, add more retailer providers only after
they have an approved data agreement and an integration test suite. Keep
matching deterministic and reviewed; never turn remote catalog data into
executable extension logic.
