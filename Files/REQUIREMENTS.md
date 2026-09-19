# Pinkless — Build Requirements

## 1. Product decision

Pinkless is a Chrome extension and companion Marketplace that compare a
**product marketed to women** with a **reviewed men's or neutral equivalent
sold at the same Kroger store**. Kroger is the only supported retailer.
Pinkless must only flag an offer when the women's product and the men's or
neutral product are linked by a reviewed equivalence record, both are priced
by Kroger's official API at the same store in the same price context, and the
men's or neutral product costs less. The comparison never runs the other way.

> **Scope revision (Sep 2026).** This supersedes the CVS/Kroger/Walmart
> exact-UPC design. CVS and Walmart had no approved data access, and a single
> retailer cannot offer "the same product elsewhere". Cross-retailer
> comparison moves to §9 (deferred).

The first release is a hackathon demo, not an automated system for judging
whether a price is discriminatory. Its user-facing promise is:

> At your selected Kroger store, a comparable men's or neutral version of
> this product cost less when last checked. Here is what matches and what
> differs.

Silence is the default. A weak keyword match, an unreviewed pairing, an
unknown price, an unavailable alternative, or non-positive savings must not
produce a badge.

## 2. MVP scope

### In scope

- One supported retailer: Kroger, through its official Products and
  Locations APIs.
- Same-store comparisons from a women's product to a men's or neutral product
  that a reviewer has linked in a `ProductEquivalence` record, starting with
  razors and expanding only when review quality is proven.
- Chrome Manifest V3 extension, loadable unpacked.
- Product title, UPC/GTIN when present, current price, selected variant,
  canonical URL/product ID, and availability extraction from the current page.
- A non-intrusive in-page badge that names the equivalent product, shows the
  savings, and gives a concise matching rationale with known differences.
- A click-through to the equivalent product's Kroger listing or its
  Marketplace detail page.
- A Vercel-deployed Marketplace with comparison cards, explanation, freshness
  data, and outbound links.
- A controlled fallback demo page for judging if a retailer changes its DOM or
  inventory during the event.

### Explicitly out of scope

- Scraping retailer pages or calling undocumented retailer endpoints.
- Accounts, saved preferences, payment, checkout, affiliates, or user tracking.
- Claims that a retailer or item is legally discriminatory, or that a price
  difference is caused by who a product is marketed to.
- CVS, Walmart, Amazon, or any retailer other than Kroger (see §9).
- Cross-store comparisons (two different Kroger stores).
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
                           rate limiting, and Kroger credentials
         |
         +--> KrogerAdapter       official Products/Locations API
         |
         v
packages/matcher/         pure identity, pairing, eligibility, and money logic
packages/catalog/         product identity, reviewed equivalence pairs, and
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
      equivalences.json
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

1. Run a content script only on declared Kroger domains.
2. Let a page adapter extract a normalized `ProductView` from the current page.
3. Send the minimum needed identity and the selected Kroger store to the API.
4. Render the eligible equivalent offer returned by the API in one Shadow DOM
   root.
5. Re-evaluate with a debounced `MutationObserver` when a product page changes
   variants or navigates client-side.

The extension must not contain retailer credentials or request an arbitrary
page history. It may send the current product identity and selected retailer
location to the Pinkless API solely to obtain a comparison.

### API responsibilities

- Keep all retailer credentials in Vercel environment variables; never expose
  them to the extension or Marketplace.
- Use one provider adapter per retailer (today: Kroger only) and return a
  shared normalized `Offer`.
- Price **both** the current product and its equivalent from the provider, for
  the same store and price context, in the same request. The price the
  extension reads from the page is never used to compute savings; it may only
  be used to detect a stale or mismatched page, which suppresses.
- Cache by `retailer + product ID/UPC + location + fulfillment method`, with an
  observation timestamp and provider-specific TTL/rate limit.
- Distinguish online and store-specific prices. Never present an online price
  as a local-store price or compare unlike fulfillment contexts as if they were
  equivalent.
- Fail closed when a provider has no approved credentials, returns ambiguous
  identity, lacks a price, or is unavailable.
- A private, token-protected reviewer endpoint may use AI only to draft candidate pairs from
  supplied product metadata. Its output must be structurally filtered, marked as requiring human
  review, and unable to write catalog data or affect a shopper-facing comparison. A person must
  still write and approve every `ProductEquivalence` record.

### Provider configuration

- `PINKLESS_PROVIDER_MODE=mock` enables deterministic local Kroger fixtures
  (products, equivalents, and store prices). Any other value uses the fail-closed live registry.
- `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET` are server-only credentials for
  Kroger's OAuth client-credentials flow. They must be configured in Vercel and
  must never use the client-visible `VITE_` prefix.
- Request only the `product.compact` scope. Pinkless never requests Kroger's
  Cart or Profile scopes or any customer-authorized flow.
- The CVS and Walmart provider shells are removed from the live registry.
  They accept no credentials.
- `.env.example` documents variable names only. `.env` and `.env.*` files are
  ignored so credentials cannot be committed accidentally.
- `GEMINI_API_KEY` and `PINKLESS_REVIEW_API_TOKEN` are server-only credentials for the private
  reviewer workflow. They must be configured in Vercel, never exposed to browser code, and never
  use a `VITE_` prefix. `GEMINI_MODEL` may select the server-side Gemini model.
- `PINKLESS_ALLOWED_ORIGINS` is an exact comma-separated allowlist containing
  the deployed Marketplace origin and final `chrome-extension://` origin.

### Phase 2 API contract

- `GET /api/stores` accepts a US postal code and returns normalized Kroger
  locations.
- `POST /api/compare` accepts a normalized `current` product view, a Kroger
  `locationId`, and a price context (`in-store` or `store-pickup`).
- `GET /api/comparisons?locationId=&priceContext=in-store` (for the
  Marketplace) returns every active pair where the men's or neutral product
  currently costs less at that store, using the same matcher rules as
  `POST /api/compare`. If Kroger can't price any product in the list, the whole
  list is suppressed rather than silently shortened.
- Browser origins must match the configured allowlist. Development may include
  safe reason codes; production `no-match` and `suppressed` responses do not.

### Marketplace responsibilities

- Deploy on Vercel and call the same read-only comparison API as the extension.
- Let the shopper pick a Kroger store by postal code. The chosen store ID may
  live in the URL; it is not stored server-side or tied to a person.
- Show a category index, comparison cards naming both products, the store,
  price context, price date, equivalence rationale, known differences, and
  outbound links to both Kroger listings.
- Remain usable with JavaScript enabled on current desktop browsers.
- Have no login, checkout, or user tracking.

### Recommended implementation stack

- **TypeScript** for extension, matcher, catalog validation, and Marketplace.
- **React + Vite** for the Marketplace, deployed on Vercel, plus Vercel
  serverless functions for the comparison API.
- **Vite-based extension build** (or a small direct MV3 setup) that emits an
  unpacked Chrome extension.
- **JSON** for product identity/reviewed-alternative policy and fixtures, validated
  during development and CI. Live offers are server-fetched and cached.
- **Plain CSS** for the injected badge to minimize extension build complexity;
  use a Shadow DOM to isolate it from retailer styles.

## 4. Product identity and offer requirements

Product identity and reviewed equivalence are the trust boundary. A product
record documents one canonical packaged item; a `ProductEquivalence` record
documents why two different items are comparable. Neither freezes a price.
The matcher must use an exact UPC/GTIN where available. A Kroger productId or
canonical URL may identify the product on a page, but title matching alone
must never independently produce a badge, and no pairing may be inferred
automatically — every pair is written and reviewed by a person.

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
  retailer: "kroger";
  productId: string; // Kroger's 13-digit productId
  canonicalUrl: string;
  canonicalUrlPatterns: string[];
};

// One packaged item. No longer carries equivalence: a product is only
// compared through a ProductEquivalence record.
type Product = {
  id: string;
  upc?: string;
  name: string;
  brand?: string;
  variant: string;
  category: "razors" | "deodorant" | "body-wash" | "shave-care" | "lotion"
    | "face-care" | "hair-care" | "soap";
  audience: "women" | "men" | "unisex";
  size: Size;
  // Who the listing or package markets it to. A factual label, not a claim.
  marketedTo: "women" | "men" | "neutral";
  identities: RetailerIdentity[];
  status: "active" | "paused" | "retired";
};

// A reviewed link between exactly one women's product and one men's or
// neutral product. The badge shows on the women's product only, and only
// when the other one costs less at the same store.
type ProductEquivalence = {
  id: string;
  productIds: [string, string];
  rationale: string;          // what makes them comparable, in plain terms
  matchedAttributes: string[]; // e.g. "blade count", "pack count", "net weight"
  knownDifferences: string[];  // required, may not be empty: e.g. "handle color", "scent"
  reviewedBy: string;
  reviewedAt: string;          // ISO date
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
- identities that would connect incompatible packaged quantities;
- an equivalence that references a missing product, pairs a product with
  itself, or repeats an existing pair in either order;
- an active equivalence whose products are not both active;
- an equivalence that does not pair exactly one `women` product with one
  `men` or `neutral` product;
- an equivalence across categories, or between different size units (amounts
  may differ; see §5 per-unit rule);
- an equivalence with an empty rationale, empty `knownDifferences`, or no
  reviewer and review date.

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

1. Resolve an active product by exact UPC, Kroger product ID, or canonical URL
   pattern, in that order.
2. Ensure the page reports an in-stock product and the selected variant is
   compatible with the canonical product.
3. If the product is marketed to women, find the active `ProductEquivalence`
   records linking it to an active men's or neutral product. Any other
   product, or no such record → `no-match`.
4. Obtain provider offers for the current product and each equivalent, for the
   same Kroger `locationId` and the same price context. Use only Kroger's
   regular price, never a promo price.
5. Both offers must be USD, positive, in stock, and unexpired.
6. Savings = current regular price − the equivalent's regular price scaled
   to the current product's amount (`ceil(equivalentCents × currentAmount /
   equivalentAmount)`, integer cents, amounts in hundredths). With equal sizes
   this is the plain price difference (`basis: "same-size"`); otherwise
   `basis: "per-unit"`. Rounding up only ever understates savings. Pick the
   equivalent with the largest savings. Zero or negative → `no-match`.
7. Return a display model (both products, both prices, store, price context,
   observation time, rationale, known differences) only if all checks pass.

The matcher compares per unit only within one size unit (oz with oz, count
with count), never across units or with estimated conversions. It must not
compare membership-only or loyalty prices. Brand
may be the same or different; being the same brand never makes two products
equivalent on its own.

## 6. Extension UX requirements

### Badge content

- Headline: `Comparable alternative: save $X.XX` (same size), or
  `Comparable alternative: save $X.XX for the same amount` (per unit; the
  product line then states both sizes).
- Product line: `Men's version:` (or `Neutral version:`), then the
  equivalent product's name and price at the selected store.
- Supporting text: short reviewed rationale plus the first known difference,
  for example: `Both are 3-blade disposable razors, 4 ct. Differs: handle
  color. Prices at Kroger On the Rhine, checked Sep 18.`
- Copy states attributes, prices, and who each product is marketed to (as the
  listing or package says). It never says why prices differ and never claims
  a retailer or manufacturer discriminates.
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
- The primary action opens the equivalent product's reviewed Kroger URL in a
  new tab.
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
| Offers from two different Kroger stores | Suppress. |
| No store selected | Suppress; prompt for a store rather than guessing one. |
| Kroger credentials missing or API unavailable | Suppress; return no partial or invented price. |
| Only one of the two products can be priced | Suppress. |
| Page price disagrees with the provider price for the current product | Suppress (stale page or different store selected on kroger.com). |
| Equivalence record is paused, retired, or unreviewed | Suppress. |
| Third-party marketplace seller | Exclude from the initial catalog. |
| Page is an ad, search result, category page, or quick-view modal | Suppress. |
| Retailer changes DOM / extracted data is incomplete | Suppress, log a development-only diagnostic, rely on fallback demo page. |
| Client-side route/variant change | Debounce and recompute; never leave stale savings visible. |
| Duplicate/injected UI collision | Use a fixed unique root ID and Shadow DOM; replace rather than append. |
| Cached offer is expired | Revalidate through the provider; suppress it if refresh fails. |
| Products differ in anything a shopper would weigh (blade count, formula, SPF, scent family, pack count) | Do not pair them. Cosmetic differences (color, fragrance name, packaging) are allowed only when listed in `knownDifferences`. |
| Gender marketing is ambiguous | Do not publish the comparison until reviewer documents the rationale. |

## 8. Quality gates and acceptance criteria

The demo is ready only when all of the following are true:

- A known supported product shows one correct badge in under three seconds on a warm cache.
- Its savings equal `current regular price - equivalent regular price` at the
  same store exactly.
- Clicking the badge opens the expected equivalent product's Kroger URL.
- An unknown product, a non-product page, an unavailable item, and a product
  with no positive savings remain quiet.
- Changing a supported product variant updates or removes the badge correctly.
- The Marketplace identifies the shared retailer, both product names, price
  context, and observed time for each displayed comparison.
- Product-identity catalog validation runs cleanly before a build.
- Fixture-based tests cover the Kroger page adapter, the Kroger provider, and
  the matcher's key suppression rules, including every pairing rule above.
- Every active equivalence record has been checked against live Kroger data
  (both products found, same size, prices returned) at the demo store.
- The unpacked extension and Vercel Marketplace use only the Pinkless API and
  Kroger's official API; no page scraping is used.

## 9. Deferred production work

- Cross-retailer comparison (CVS, Walmart, others): add a retailer only after
  it has an approved data agreement and an integration test suite.
- Quantity-different pairs (for example, a 4-count equivalent that costs less
  than a 3-count current product). Not allowed in this release.

Keep matching deterministic and reviewed; never turn remote catalog data into
executable extension logic.

## 10. Open questions

1. **Kroger UPC format.** Kroger's `upc` and `productId` are 13 digits (for
   example `0004740031389`), which appears to be the UPC-A without its check
   digit, zero-padded. Confirm against a physical package before the catalog
   stores UPCs, and store the Kroger form in `identities[].productId`.
2. **Page price vs API price.** The rule above suppresses when they disagree.
   If kroger.com routinely shows the promo price on the page, compare against
   the page's regular (strike-through) price instead, or drop the check.
3. **Marketplace without a store.** The Marketplace asks for a Kroger store
   first; nothing is priced until one is picked. A configured demo store ID
   for judging is still open.
4. **Rate limits.** Each Marketplace store view prices up to 2 × (number of
   pairs) products. Cache offers per `productId + locationId + priceContext`
   and confirm Kroger's daily call limit for the registered app.
5. **Amazon via Canopy.** Canopy's Amazon data is scraped, which §2 rules
   out, and Amazon online prices can't be compared with Kroger store prices.
   Not used. Revisit only as Amazon-vs-Amazon pairs, and only if the team
   explicitly accepts scraped data.
6. **One-directional framing.** Only showing pairs where the women's product
   costs more is a deliberate product choice. The Marketplace should not
   imply that it describes all products; consider publishing how many
   reviewed pairs were checked versus shown.
