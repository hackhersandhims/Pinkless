# Pinkless — Build Tasks

## Delivery rule

Complete tasks in order. Do not expand retailer coverage, build accounts, or
add live scraping until the **one-retailer demo path** works end to end.

## Phase 0 — Decisions and setup

- [x] Confirm the first supported retailer: Target.
- [ ] Select three Target demo product URLs before beginning the retailer
  adapter work.
- [x] Confirm the Marketplace deployment choice: Vercel.
- [x] Create a TypeScript workspace with `apps/extension`, `apps/marketplace`,
  `packages/catalog`, and `packages/matcher`.
- [x] Add a root script for format, typecheck, test, catalog validation, and
  production builds.
- [x] Add `.gitignore`, a concise README, and an environment-free local setup
  guide.

**Done when:** a fresh checkout builds an empty extension and empty static
Marketplace without credentials.

## Phase 1 — Catalog first

- [x] Implement the `Comparison`, `ProductView`, `Money`, and `Size` types
  defined in [REQUIREMENTS.md](REQUIREMENTS.md).
- [ ] Create `comparisons.json` with 12–20 manually researched records across
  2–3 categories. Start with records for the three demo URLs.
- [ ] Record canonical URL/product ID, selected variant, quantity, regular
  one-time price, alternative URL, rationale, sources, and verification date
  for every record.
- [x] Implement catalog validation.
- [x] Make validation fail for duplicated IDs, invalid money, missing evidence,
  incompatible sizes, bad URL patterns, inactive alternative, and non-cheaper
  alternative.
- [x] Add one intentionally invalid fixture to prove validation works.

**Done when:** validation passes for the real catalog and its error messages are
clear enough for a teammate to correct data without touching matching code.

## Phase 2 — Pure matcher

- [ ] Implement retailer + exact product ID matching.
- [ ] Implement canonical URL-pattern matching as the only fallback.
- [ ] Implement current-price versus alternative-price savings calculation using
  integer cents.
- [ ] Return structured outcomes: `show`, `no-match`, and `suppressed`, each
  with a development-only reason code.
- [ ] Add tests for exact match, URL match, unknown product, invalid price,
  wrong currency, out of stock, mismatched variant, zero/negative savings, and
  paused catalog record.
- [ ] Add a money formatter and tests for `$0.01`, whole dollars, and large
  values.

**Done when:** the matcher has no DOM or Chrome dependency and all suppression
rules are tested.

## Phase 3 — Retailer adapter and fixtures

- [ ] Inspect the first retailer’s three selected product pages.
- [ ] Define a `RetailerAdapter` interface with `canHandle(url)` and
  `extract(document, location): ProductView | null`.
- [ ] Write selectors for title, canonical URL/product ID, selected variant,
  one-time price, currency, and stock state.
- [ ] Capture sanitized HTML fixtures for each happy-path product plus: unknown
  product, sale/subscription display, out-of-stock listing, and variant switch.
- [ ] Test the adapter entirely against fixtures.
- [ ] Add a debounced page-change observer plan for client-side navigation and
  variation changes.

**Done when:** fixture tests prove that the adapter extracts the expected
`ProductView` and fails closed for missing or ambiguous page data.

## Phase 4 — Extension core

- [ ] Create a Manifest V3 extension with content-script matches restricted to
  the first retailer domain.
- [ ] Bundle the catalog and matcher locally; do not make runtime network calls.
- [ ] Connect adapter → matcher → renderer in the content script.
- [ ] Build a small badge in a Shadow DOM root with a stable, unique root ID.
- [ ] Add keyboard-accessible `See alternative`, `Why this was matched`, and
  dismiss controls.
- [ ] Open the vetted alternative URL in a new tab from the primary action.
- [ ] Ensure repeated content-script execution or DOM updates cannot create a
  duplicate badge.
- [ ] Add a minimal popup: supported status, Marketplace link, and version.
- [ ] Load the extension unpacked and manually test all three demo products.

**Done when:** the full extension flow works on at least three live product
pages and silently fails on the negative cases.

## Phase 5 — Fallback demo page

- [ ] Create a static product page controlled by the team that exposes the same
  product information needed by the adapter.
- [ ] Add that page as a separately supported demo host/path.
- [ ] Seed it with one reviewed comparison and an interactive variant that
  changes its price.
- [ ] Rehearse the full fallback flow in an incognito Chrome profile with the
  unpacked extension.

**Done when:** a retailer outage, login wall, or DOM change cannot break the
judged demo.

## Phase 6 — Marketplace

- [ ] Create a static TypeScript/React Marketplace that imports the shared
  catalog at build time.
- [ ] Build a hero section that explains the product without making a legal
  claim about a specific listing.
- [ ] Render active comparisons once, grouped by category.
- [ ] Show target and alternative names, price difference, equivalence
  rationale, verification date, and outbound purchase link.
- [ ] Add empty states for a category with no active comparisons.
- [ ] Add responsive layout, visible focus states, sensible color contrast, and
  descriptive link labels.
- [ ] Create a detail route or queryable card state only if it improves the
  extension handoff; otherwise link straight to the retailer.
- [ ] Deploy the static site and put its URL in the extension popup.

**Done when:** the deployed site reflects the same catalog records and savings
as the extension.

## Phase 7 — Integration and demo quality

- [ ] Compare Marketplace and extension output for every active catalog record.
- [ ] Test badge rendering on narrow and wide desktop windows.
- [ ] Verify one badge only after refresh, variant change, and client-side
  navigation.
- [ ] Test keyboard navigation and screen-reader labels for the badge.
- [ ] Verify every outbound URL works and opens the intended listing.
- [ ] Add a visible `Last verified` date and ensure stale records can be paused
  by changing one catalog field.
- [ ] Run formatter, typecheck, catalog validation, unit tests, and production
  builds from a clean checkout.
- [ ] Write the two-minute demo script and assign demo roles.

**Done when:** the team can demonstrate live retailer → badge → cheaper option
→ Marketplace, then repeat it successfully on the fallback page.

## Stretch tasks — only after MVP is complete

- [ ] Add a second retailer adapter and its complete fixture suite.
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
4. Build one retailer adapter against a saved fixture.
5. Wire the content script to show a static badge for that fixture.
6. Replace the static badge with the matcher result.
7. Test on the live URL and create the fallback page before moving to the
   Marketplace.
