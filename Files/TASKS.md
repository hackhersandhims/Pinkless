# Pinkless — Build Tasks

## Scope revision

The completed Target-only setup was the original prototype decision. Pinkless
now compares exact packaged products across **CVS, Kroger, and Walmart**.
Retailer data must come through approved APIs or licensed provider data; page
scraping and undocumented endpoints are prohibited.

## Phase 0 — Decisions and setup

- [x] Record the original Target-only prototype decision as superseded.
- [x] Select CVS, Kroger, and Walmart as the first retailer network.
- [x] Set exact UPC/GTIN identity matching as the first comparison policy.
- [x] Set a same-context price policy: online compares only with online;
  store-specific compares only with the same local-store context.
- [x] Confirm the Marketplace deployment choice: Vercel.
- [x] Create a TypeScript workspace with `apps/extension`, `apps/marketplace`,
  `packages/catalog`, and `packages/matcher`.
- [x] Add a root script for format, typecheck, test, catalog validation, and
  production builds.
- [x] Add `.gitignore`, a concise README, and an environment-free local setup
  guide.

**Done when:** the retailer scope, safe data-access policy, and deployment
direction are documented; a fresh checkout builds without credentials.

## Phase 1 — Shared identity and provider foundation

- [x] Implement the original `Comparison`, `ProductView`, `Money`, and `Size`
  types; `Comparison` is now superseded by live-offer architecture.
- [x] Replace target/alternative types with retailer-neutral `Product`,
  `RetailerIdentity`, and time-bounded `Offer` types.
- [x] Convert validation to reject duplicate products/UPCs, invalid identity,
  invalid size or URL patterns, and unsupported equivalence policies.
- [x] Define a `RetailerProvider` interface for product, location, and offer
  lookup.
- [x] Implement the Kroger provider against its official product/location APIs.
- [x] Add CVS and Walmart provider shells that fail closed until approved
  credentials or licensed product-and-price data are supplied.
- [x] Define Vercel environment variables and a local mock-provider mode;
  never commit credentials.
- [x] Add provider-contract fixtures/tests for CVS, Kroger, and Walmart.

**Done when:** mocked providers return normalized offers, identity validation
passes, and unavailable providers never yield invented results.

## Phase 2 — Vercel comparison API and matcher

- [x] Add Vercel serverless routes for store lookup and product comparison.
- [x] Validate retailer, UPC/product identity, location, and request origin.
- [x] Query enabled providers in parallel, normalize results, and cache by
  retailer + identity + location + fulfillment context.
- [x] Preserve `observedAt`/expiry data and apply provider timeouts/rate limits.
- [x] Implement exact UPC, retailer-ID, and canonical-URL matching in that order.
- [x] Compare only positive, in-stock, unexpired offers in the same price context.
- [x] Return structured `show`, `no-match`, and `suppressed` outcomes with safe
  development-only reason codes.
- [x] Test cache hits, provider failures, invalid price/currency, stock,
  identity conflicts, unequal contexts, and zero/negative savings.

**Done when:** the API and matcher have no Chrome dependency and suppress every
ambiguous or unavailable result.

## Phase 3 — CVS, Kroger, and Walmart page adapters

- [ ] Define a `RetailerAdapter` interface with `canHandle(url)` and
  `extract(document, location): ProductView | null`.
- [ ] Inspect product pages from CVS, Kroger, and Walmart.
- [ ] Build page adapters for title, UPC/product ID, selected variant, ordinary
  one-time price, price context, currency, and stock state.
- [ ] Capture sanitized fixtures for every retailer: happy path, unknown item,
  promotion/subscription display, out-of-stock state, and variant switch.
- [ ] Test every adapter entirely against fixtures and fail closed for ambiguity.
- [ ] Add a debounced page-change observer plan for navigation and variants.

**Done when:** each supported retailer produces a valid `ProductView` in
fixtures and no incomplete page can trigger a comparison.

## Phase 4 — Extension core

- [ ] Create a Manifest V3 extension with content-script matches restricted to
  CVS, Kroger, and Walmart domains.
- [ ] Connect page adapter → Pinkless API → matcher → renderer in the content script.
- [ ] Add explicit user store selection or ZIP-based store lookup.
- [ ] Build a small badge in a Shadow DOM root with a stable, unique root ID.
- [ ] Add keyboard-accessible `See alternative`, `Why this was matched`, and
  dismiss controls.
- [ ] Open the vetted alternative URL in a new tab from the primary action.
- [ ] Ensure repeated content-script execution or DOM updates cannot create a
  duplicate badge.
- [ ] Add a minimal popup: provider status, store selection, Marketplace link, and version.
- [ ] Load the extension unpacked and manually test a product page for each retailer.

**Done when:** the full extension flow works with activated providers and
silently fails when a product, price, provider, or location is unsafe.

## Phase 5 — Fallback demo page

- [ ] Create a static product page controlled by the team that exposes the same
  product information needed by the adapter.
- [ ] Add that page as a separately supported demo host/path.
- [ ] Seed it with mocked CVS, Kroger, and Walmart offers plus an interactive
  variant that changes its price.
- [ ] Rehearse the full fallback flow in an incognito Chrome profile with the
  unpacked extension.

**Done when:** a retailer outage, login wall, or DOM change cannot break the
judged demo.

## Phase 6 — Marketplace

- [ ] Create a TypeScript/React Marketplace deployed on Vercel.
- [ ] Read display-safe comparisons from the same API as the extension; do not
  embed provider credentials.
- [ ] Build a hero section that explains the product without making a legal
  claim about a specific listing.
- [ ] Render active comparison results once, grouped by category.
- [ ] Show both retailers, price context, price difference, equivalence
  rationale, observed time, and outbound purchase link.
- [ ] Add empty states for a category with no active comparisons.
- [ ] Add responsive layout, visible focus states, sensible color contrast, and
  descriptive link labels.
- [ ] Create a detail route or queryable card state only if it improves the
  extension handoff; otherwise link straight to the retailer.
- [ ] Deploy the static site and put its URL in the extension popup.

**Done when:** the deployed site reflects the same normalized API result and
savings as the extension.

## Phase 7 — Integration and demo quality

- [ ] Create and link the Vercel project; configure preview/production domains,
  allowed origins, server-only credentials, and the first preview deployment.
- [ ] Register Pinkless with Kroger and store credentials only in Vercel environment variables.
- [ ] Obtain approved CVS product-and-price data access and activate its provider.
- [ ] Obtain approved Walmart product-and-price data access and activate its provider.
- [ ] Compare Marketplace and extension output for every active product result.
- [ ] Test badge rendering on narrow and wide desktop windows.
- [ ] Verify one badge only after refresh, variant change, and client-side
  navigation.
- [ ] Test keyboard navigation and screen-reader labels for the badge.
- [ ] Verify every outbound URL works and opens the intended listing.
- [ ] Add a visible `Last checked` timestamp and ensure expired offers suppress.
- [ ] Run formatter, typecheck, catalog validation, unit/API tests, and production builds from a clean checkout.
- [ ] Write the two-minute demo script and assign demo roles.

**Done when:** the team can demonstrate live retailer → API → verified cheaper
option → Marketplace, then repeat it with the mocked fallback page.

## Later expansion

- [ ] Add a retailer only after it has approved data access and a complete fixture suite.
- [ ] Add a third category after catalog review, not through fuzzy matching.
- [ ] Display price-per-unit comparisons only with category-specific,
  reviewer-approved normalization rules.
- [ ] Add optional local-only savings history using `chrome.storage`.
- [ ] Add a private reviewer workflow for catalog maintenance.
- [ ] Add analytics only after defining consent, retention, and privacy rules.

## First build session: exact sequence

1. Create the workspace and both apps/packages.
2. Add the types and one valid comparison record.
3. Build and test the pure matcher against that record.
4. Build a mocked Kroger provider and the first retailer page adapter against a saved fixture.
5. Build the comparison API contract and its fixture tests.
6. Wire the content script to render the API/matcher result.
7. Test on a live URL only after the relevant provider is approved; create the
   fallback page before moving to the Marketplace.
