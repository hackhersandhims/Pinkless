# Pinkless — Build Requirements

## 1. Product decision

Pinkless is a Chrome extension and companion Marketplace that make a curated
comparison at the point of shopping. It must **only** flag a product when the
catalog contains a reviewed, functionally comparable, cheaper alternative.

The first release is a hackathon demo, not an automated system for judging
whether a price is discriminatory. Its user-facing promise is:

> We found a verified comparable alternative that was priced lower when last
> checked.

Silence is the default. A weak keyword match, unknown price, unavailable
alternative, or non-positive savings must not produce a badge.

## 2. MVP scope

### In scope

- One supported retailer for the first end-to-end demo; add a second only once
  the first is reliable.
- 12–20 manually reviewed product comparisons in a shared catalog.
- Chrome Manifest V3 extension, loadable unpacked.
- Product title, current price, selected variant, canonical URL/product ID, and
  availability extraction from the supported retailer.
- A non-intrusive in-page badge that shows the savings and a concise matching
  rationale.
- A click-through to the alternative retailer listing or its Marketplace detail
  page.
- A static Marketplace with category browsing, comparison cards, explanation,
  and outbound links.
- A controlled fallback demo page for judging if a retailer changes its DOM or
  inventory during the event.

### Explicitly out of scope

- Real-time web-wide product discovery or price scraping.
- Accounts, saved preferences, payment, checkout, affiliates, or user tracking.
- Claims that a retailer or item is legally discriminatory.
- A recommendation produced solely by AI or fuzzy keyword matching.
- Price tracking, personal savings history, community submissions, and browser
  support beyond Chrome.

## 3. Technical architecture

```text
packages/catalog/       reviewed comparison records + validation
         |
         +--> apps/extension/     Chrome MV3 content script and popup
         |
         +--> apps/marketplace/   static React site

packages/matcher/       pure identity, eligibility, and money logic
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
    marketplace/
      src/
  packages/
    catalog/
      comparisons.json
      schema.ts
      validate.ts
    matcher/
      src/
  fixtures/
    retailer-one/
  REQUIREMENTS.md
  TASKS.md
```

### Extension responsibilities

1. Run a content script only on declared supported retailer domains.
2. Let a retailer adapter extract a normalized `ProductView` from the current
   page.
3. Match that view to an exact, curated target listing in the catalog.
4. Evaluate whether the current observed target price and recorded alternative
   price form a valid saving.
5. Render exactly one badge inside a Shadow DOM root.
6. Re-evaluate with a debounced `MutationObserver` when a product page changes
   variants or navigates client-side.

The extension must not transmit title, price, URLs, or browsing history. All
catalog data is bundled with it for the MVP.

### Marketplace responsibilities

- Build statically from the same catalog as the extension.
- Show a category index, comparison cards, price date, equivalence rationale,
  and outbound link.
- Remain usable with JavaScript enabled on current desktop browsers.
- Have no backend, login, or client-side price fetching in MVP.

### Recommended implementation stack

- **TypeScript** for extension, matcher, catalog validation, and Marketplace.
- **React + Vite** for the Marketplace; choose Next.js only if the team already
  prefers it. The app is static, so server rendering is unnecessary.
- **Vite-based extension build** (or a small direct MV3 setup) that emits an
  unpacked Chrome extension.
- **JSON** as the source catalog, validated during development and CI.
- **Plain CSS** for the injected badge to minimize extension build complexity;
  use a Shadow DOM to isolate it from retailer styles.

## 4. Shared catalog requirements

Catalog data is the product’s trust boundary. Each comparison must be manually
reviewed and versioned. The matching layer must prefer a retailer product ID or
canonical URL pattern; title/category matching may help diagnose a mismatch but
must not independently show a badge.

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

type TargetListing = {
  retailer: string;
  productId?: string;
  canonicalUrlPatterns: string[];
  name: string;
  brand?: string;
  variant: string;
  marketedAs: "women" | "men" | "unisex";
  size: Size;
};

type AlternativeListing = {
  retailer: string;
  url: string;
  name: string;
  price: Money;
  size: Size;
  condition: "new";
  availability: "verified-in-stock";
};

type Comparison = {
  id: string;
  category: "razors" | "deodorant" | "body-wash";
  target: TargetListing;
  alternative: AlternativeListing;
  equivalence: {
    rationale: string;
    matchedAttributes: string[];
    knownDifferences?: string[];
  };
  evidence: {
    verifiedAt: string; // ISO date
    sourceUrls: string[];
  };
  status: "active" | "paused" | "retired";
};
```

Catalog validation must reject:

- duplicate comparison IDs;
- active records without one canonical target identifier;
- empty rationale or source URLs;
- invalid sizes, prices, dates, currency, or alternative URL;
- alternatives that are not new and verified in stock;
- target and alternative sizes with incompatible units;
- active records whose recorded alternative is not cheaper.

## 5. Matching and savings rules

`ProductView` is the normalized result from a retailer adapter:

```ts
type ProductView = {
  retailer: string;
  canonicalUrl: string;
  productId?: string;
  title: string;
  selectedVariant?: string;
  currentPriceCents?: number;
  currency?: string;
  availability: "in-stock" | "out-of-stock" | "unknown";
};
```

The matcher must:

1. Find an `active` catalog record with the same retailer and exact product ID
   or matching canonical URL pattern.
2. Ensure the page reports USD, an in-stock product, and a positive price.
3. Ensure the selected page variant is compatible with the catalog variant.
4. Compare the current displayed target price to the catalog alternative price.
5. Return `no-match` if savings are zero or negative.
6. Return a display model only if all checks pass.

The first version must **not** normalize price per unit automatically. If two
products differ in quantity, they should only be catalogued after human review,
with their difference stated in `knownDifferences`.

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
| Sale, coupon, membership, subscription, or “from” price | Suppress unless the adapter can identify an ordinary one-time purchasable price. |
| Price range or unparseable currency | Suppress. |
| Target price is at or below alternative price | Suppress. |
| Different size, refill, bundle, condition, or pack count | Suppress unless a reviewed catalog record explicitly covers it. |
| Product or alternative out of stock | Suppress. |
| Third-party marketplace seller | Exclude from the initial catalog. |
| Page is an ad, search result, category page, or quick-view modal | Suppress. |
| Retailer changes DOM / extracted data is incomplete | Suppress, log a development-only diagnostic, rely on fallback demo page. |
| Client-side route/variant change | Debounce and recompute; never leave stale savings visible. |
| Duplicate/injected UI collision | Use a fixed unique root ID and Shadow DOM; replace rather than append. |
| Alternative price is old | Marketplace shows `verifiedAt`; data maintainer pauses the record. |
| Gender marketing is ambiguous | Do not publish the comparison until reviewer documents the rationale. |

## 8. Quality gates and acceptance criteria

The demo is ready only when all of the following are true:

- A known supported product shows one correct badge in under three seconds.
- Its savings equal `current target price - catalog alternative price` exactly.
- Clicking the badge opens the expected alternative URL.
- An unknown product, a non-product page, an unavailable item, and a product
  with no positive savings remain quiet.
- Changing a supported product variant updates or removes the badge correctly.
- The Marketplace shows every active catalog record exactly once, grouped by
  category, with savings, rationale, and verification date.
- Catalog validation runs cleanly before a build.
- Fixture-based tests cover every retailer adapter and the matcher’s key
  suppression rules.
- The unpacked extension and static Marketplace can be demonstrated without a
  backend or live scraping.

## 9. Deferred production work

After the hackathon, introduce a backend only for catalog review, price
verification, availability checks, analytics with consent, and customer-facing
data freshness. Keep matching deterministic and reviewed; never turn remote
catalog data into executable extension logic.
