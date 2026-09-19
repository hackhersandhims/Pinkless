# Agent guardrails for Pinkless

This file is the always-loaded rulebook for any AI coding agent working in
this repo (Codex, etc.). Claude Code users get the same rules as
auto-triggering skills in `.claude/skills/` — this file exists so agents that
don't read that format (Codex and others) still get them. Ground truth for
all of it is `Files/REQUIREMENTS.md`; when this file and REQUIREMENTS.md
disagree, REQUIREMENTS.md wins — re-read it if something here looks stale,
since it changes as the team builds.

Architecture in one line: `apps/extension` extracts product identity on CVS/
Kroger/Walmart pages and sends only that identity + selected store to
`apps/api` (Vercel serverless), which holds retailer credentials, calls one
provider adapter per retailer, and returns normalized `Offer`s; `packages/matcher`
does eligibility/savings logic; `packages/catalog` holds reviewed product
identity/equivalence records; `apps/marketplace` calls the same read-only API.

---

## 1. Frontend craft (`apps/marketplace`, extension popup/badge UI)

- Design tokens live in `packages/tokens/` (`tokens.json` is source of truth,
  `tokens.css` is compiled). See `DESIGN_SYSTEM.md`.
- Always style with the CSS variables (`var(--surface-pink)`, `var(--ink)`,
  `var(--space-4)`, `var(--radius-md)`, etc.) and the type classes
  (`.display`, `.heading`, `.body`, `.caption`, `.label`). **Never** write a
  raw hex value or a magic font-size/spacing number. If a needed value isn't
  a token yet, stop and ask — don't invent one (there's an open question
  about primary/CTA color; don't silently resolve it).
- The extension badge renders inside a Shadow DOM and cannot inherit
  page-level CSS. Never link an external stylesheet into the shadow root —
  use `mountBadgeRoot()` from `apps/extension/src/content/shadow-root.ts`,
  which injects the generated `TOKENS_CSS` into the shadow root's own
  `<style>`. **Render all badge markup inside the `container` it returns:**
  the token variables live on `:root, [data-theme="light"]`, `:root` never
  matches in a shadow tree, so they only exist on/below the container's
  `data-theme="light"`. After changing `packages/tokens`, run
  `pnpm run tokens:sync`; `pnpm run tokens:check` (part of `build` and CI)
  fails on drift between `tokens.json`, `tokens.css`, and the extension copy.
- Accessibility bar (REQUIREMENTS §6), non-negotiable for every badge/popup
  control: keyboard-operable with descriptive accessible labels; no
  assertive ARIA live regions; never steal focus on mount/update; never
  render so it obscures a price, checkout control, or native accessibility
  element. The primary action opens the outbound URL in a new tab — it must
  not navigate the host page away.
- The Marketplace is a Vercel-deployed React app that calls the same
  read-only comparison API (`apps/api`) as the extension — it doesn't fetch
  retailer prices directly, and has no login, checkout, or user tracking.

## 2. Extension MV3 (`apps/extension/**`)

- Content script runs **only** on declared CVS, Kroger, and Walmart domains —
  explicit `matches` entries in `manifest.json`, never a broad wildcard.
- One page adapter per retailer, producing a normalized `ProductView`:
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
- The extension must **never** contain retailer credentials or request
  arbitrary page history. It may send only the current product identity and
  selected retailer/store location to the Pinkless API (`apps/api`) solely to
  obtain a comparison — no other outbound call, no analytics/telemetry.
- Re-evaluate with a **debounced** `MutationObserver` on variant change or
  client-side navigation — debounce so a burst of DOM churn triggers one
  recomputation, not many. Never leave a stale savings badge visible after a
  recompute; if the new state fails any check, remove/hide the badge.
- Render **exactly one** badge, ever, inside a Shadow DOM root, with a fixed
  unique root element ID. On remount, replace the existing root's contents —
  never append a second badge instance.
- Matching/eligibility logic belongs in `packages/matcher` / the API, not
  duplicated inline in the content script.

## 3. API and provider adapters (`apps/api/**`)

- Keep all retailer credentials in Vercel environment variables; never
  expose them to the extension or Marketplace, and never use a client-visible
  `VITE_` prefix for them.
- One provider adapter per retailer (`apps/api/src/providers/**`), each
  returning the shared `Offer` shape — don't leak a provider's raw response
  shape upward.
- Cache by `retailer + product ID/UPC + location + fulfillment method`, with
  an observation timestamp and provider-specific TTL/rate limit.
- Distinguish online and store-specific prices. Never present an online price
  as a local-store price, or compare unlike fulfillment contexts (`online` vs
  `store-pickup`/`in-store`) as equivalent.
- Fail closed: no approved credentials, ambiguous identity, no price, or
  unavailable → suppress that retailer's offer, never a partial or invented
  price.
- `PINKLESS_PROVIDER_MODE=mock` enables deterministic local CVS/Kroger/
  Walmart fixtures (`fixtures/providers/`); any other value uses the
  fail-closed live registry. CVS and Walmart currently accept no environment
  credentials — their provider shells reject every lookup until an
  approved/licensed integration exists; don't wire in an ad hoc key.
- `.env.example` documents variable **names** only, never real values. `.env`
  and `.env.*` are gitignored — never commit them.

## 4. Catalog and matcher (`packages/catalog/**`, `packages/matcher/**`)

This is the product's trust boundary. Treat every rule here as a hard
constraint.

- Money is always integer minor units: `amountCents`. **Never** use a
  floating-point value for a price, anywhere, including intermediate
  arithmetic. Flag any PR that introduces float pricing.
- Exact shared types (`Product`/`Offer`/`RetailerIdentity` — not the older
  `Comparison`/`TargetListing`/`AlternativeListing` shapes; don't resurrect
  those):
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
  ```
  Don't add fields, loosen types, or make required fields optional without
  updating `Files/REQUIREMENTS.md` in the same PR.
- Catalog validation must reject: duplicate product IDs or UPCs; an `active`
  record without a canonical identity; empty equivalence rationale; invalid
  sizes, money, URLs, or identity patterns; a duplicate retailer identity per
  product; identities that would connect incompatible packaged quantities.
- Matching resolves an active product by, **in this order**: exact UPC,
  retailer product ID, then canonical URL pattern. Title/category matching
  may help a human diagnose a mismatch, but must never independently trigger
  a badge. Currency must be USD, availability `in-stock`, price positive, and
  the selected variant compatible with the canonical product. Request
  candidate offers only from approved retailer providers. Compare the
  current offer only against in-stock, positive, unexpired offers in the
  **same price context**. Zero or negative savings → `no-match`.
- No automatic per-unit price normalization, no comparing membership-only
  prices, no treating a same-brand product as an automatic exact match.
  Quantity-different products are suppressed unless an explicit reviewed
  equivalence policy (`knownDifferences`) permits it.
- Matching stays deterministic and reviewed. Never introduce fuzzy string
  matching, embeddings, or an AI/LLM call to decide comparability or whether
  a badge should render.

## 5. Suppress by default (any matcher/adapter/provider/badge-mount logic)

Silence is the default. A weak match, unknown price, unavailable offer, or
non-positive savings must never produce a badge.

| Situation | Required behaviour |
| --- | --- |
| Sale, coupon, membership, subscription, or "from" price | Suppress unless both offers identify equivalent ordinary one-time purchasable prices. |
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

Anything not explicitly covered above or by a reviewed catalog record:
**suppress**. Never add a "best guess" fallback or a permissive default to
make the demo look more populated.

## 6. Demo readiness (pre-demo / pre-merge of the extension↔api↔matcher↔marketplace path)

- A known supported product shows one correct badge in under three seconds
  **on a warm cache**.
- Savings equal `current offer price - eligible alternative offer price`
  exactly (integer cents, no rounding drift).
- Clicking the badge opens the expected alternative URL in a new tab.
- Unknown product, non-product page, out-of-stock item, and non-positive
  savings all stay quiet.
- Changing a supported product's variant updates or removes the badge —
  never leaves a stale one.
- The Marketplace identifies the source retailer, price context, and
  observed time for every displayed offer.
- `pnpm run catalog:validate` runs cleanly.
- Fixture-based tests cover every retailer adapter (page adapters in
  `apps/extension` and provider adapters in `apps/api/src/providers`) and the
  matcher's key suppression rules.
- The unpacked extension and Vercel Marketplace use only the Pinkless API and
  approved retailer connections — no page scraping, anywhere.
- Standing reminder: `fixtures/retailers/` and `fixtures/providers/`, plus
  the fallback demo page, exist for when a retailer's DOM changes
  mid-judging. Re-run fixtures whenever an adapter or matcher changes; treat
  a broken `PINKLESS_PROVIDER_MODE=mock` path as demo-blocking; fix the
  fallback page in the same PR if it drifts from what an adapter now
  expects.

## 7. Git flow (multiple people/agents committing to this repo concurrently)

- Branch per feature: `feat/<area>-<short-desc>`; `fix/<area>-<short-desc>`
  for bugs; `chore/<short-desc>` for tooling/docs/deps. Keep branches scoped
  to one area (`apps/extension`, `apps/api`, `apps/marketplace`,
  `packages/catalog`, `packages/matcher`, `packages/tokens`) to minimize
  conflicts.
- Conventional commits: `feat: <what>`, `fix: <what>`, `chore: <what>`.
- Before merging to `main`: run `pnpm run catalog:validate`,
  `pnpm run test`, and `pnpm run typecheck` (or `pnpm run build`, which
  chains all three plus both app builds). Don't merge on a failure and "fix
  it after" — a broken `main` blocks everyone immediately.
- No force-pushing `main`. No direct push to `main` that skips the build
  check above, even for a "trivial" change. Never commit `node_modules/`,
  build output (`dist/`), or `.env`/`.env.*` files — retailer credentials
  live in Vercel, never in the repo; `.env.example` documents variable names
  only.
