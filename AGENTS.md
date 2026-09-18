# Agent guardrails for Pinkless

This file is the always-loaded rulebook for any AI coding agent working in
this repo (Codex, etc.). Claude Code users get the same rules as
auto-triggering skills in `.claude/skills/` — this file exists so agents that
don't read that format (Codex and others) still get them. Ground truth for
all of it is `Files/REQUIREMENTS.md`; when this file and REQUIREMENTS.md
disagree, REQUIREMENTS.md wins.

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
  inline `TOKENS_CSS` from `apps/extension/src/content/tokens.ts` into the
  shadow root's own `<style>` tag (see `getBadgeShadowRoot()` in
  `apps/extension/src/content/index.ts`). If `packages/tokens/tokens.css`
  changes, regenerate that inlined copy to match.
- Accessibility bar (REQUIREMENTS §6), non-negotiable for every badge/popup
  control: keyboard-operable with descriptive accessible labels; no
  assertive ARIA live regions; never steal focus on mount/update; never
  render so it obscures a price, checkout control, or native accessibility
  element. The primary action opens the outbound URL in a new tab — it must
  not navigate the host page away.
- Marketplace stays static: no client-side price fetching, no login, no
  backend calls.

## 2. Extension MV3 (`apps/extension/**`)

- Content script runs **only** on declared supported retailer domains —
  explicit `matches` entries in `manifest.json`, never a broad wildcard.
- One adapter per retailer, producing a normalized `ProductView`:
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
  Add a second retailer adapter only once the first is reliable.
- Re-evaluate with a **debounced** `MutationObserver` on variant change or
  client-side navigation — debounce so a burst of DOM churn triggers one
  recomputation, not many. Never leave a stale savings badge visible after a
  recompute; if the new state fails any check, remove/hide the badge.
- Render **exactly one** badge, ever, inside a Shadow DOM root, with a fixed
  unique root element ID. On remount, replace the existing root's contents —
  never append a second badge instance.
- Zero network calls and zero transmission of title/price/URL/browsing
  history from the content script or popup — no `fetch`, `XMLHttpRequest`,
  beacon, or analytics call. All catalog data ships bundled at build time.
  The only outbound network action is the user clicking "See alternative,"
  which opens a new tab — a browser navigation, not a script-initiated call.
- Matching/eligibility logic belongs in `packages/matcher`, not duplicated
  inline in the content script.

## 3. Catalog and matcher (`packages/catalog/**`, `packages/matcher/**`)

This is the product's trust boundary. Treat every rule here as a hard
constraint.

- Money is always integer minor units: `amountCents`. **Never** use a
  floating-point value for a price, anywhere, including intermediate
  arithmetic. Flag any PR that introduces float pricing.
- Exact shared types (do not add fields, loosen types, or make required
  fields optional without updating REQUIREMENTS.md in the same PR):
  ```ts
  type Money = { amountCents: number; currency: "USD" };
  type Size = { amount: number; unit: "oz" | "ml" | "count" };
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
    evidence: { verifiedAt: string; sourceUrls: string[] };
    status: "active" | "paused" | "retired";
  };
  ```
- Catalog validation must reject: duplicate comparison IDs; an `active`
  record without one canonical target identifier; empty rationale or source
  URLs; invalid sizes, prices, dates, currency, or alternative URL; an
  alternative that isn't `condition: "new"` and `availability:
  "verified-in-stock"`; target/alternative sizes with incompatible units; an
  `active` record whose alternative is not cheaper than the target.
- Matching must **prefer** an exact `productId` or matching
  `canonicalUrlPatterns` entry. Title/category matching may help a human
  diagnose a mismatch, but must never independently trigger a badge.
  Currency must be USD, availability `in-stock`, price positive, and the
  selected variant compatible with the catalog's `variant` — otherwise no
  match. Savings = current target price − catalog alternative price; zero or
  negative is `no-match`.
- No automatic per-unit price normalization. Quantity-different products are
  only compared after human review with the difference recorded in
  `knownDifferences`.
- Matching stays deterministic and reviewed. Never introduce fuzzy string
  matching, embeddings, or an AI/LLM call to decide comparability or whether
  a badge should render.

## 4. Suppress by default (any matcher/adapter/badge-mount logic)

Silence is the default. A weak match, unknown price, unavailable
alternative, or non-positive savings must never produce a badge.

| Situation | Required behaviour |
| --- | --- |
| Sale, coupon, membership, subscription, or "from" price | Suppress unless the adapter can identify an ordinary one-time purchasable price. |
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

Anything not explicitly covered above or by a reviewed catalog record:
**suppress**. Never add a "best guess" fallback or a permissive default to
make the demo look more populated.

## 5. Demo readiness (pre-demo / pre-merge of the extension↔matcher↔marketplace path)

- A known supported product shows exactly one correct badge in under three
  seconds.
- Savings equal `current target price - catalog alternative price` exactly
  (integer cents, no rounding drift).
- Clicking the badge opens the expected alternative URL in a new tab.
- Unknown product, non-product page, out-of-stock item, and non-positive
  savings all stay quiet.
- Changing a supported product's variant updates or removes the badge —
  never leaves a stale one.
- The Marketplace shows every `active` catalog record exactly once, grouped
  by category, with savings, rationale, and verification date.
- `pnpm run catalog:validate` runs cleanly.
- Fixture-based tests cover every retailer adapter and the matcher's key
  suppression rules.
- The unpacked extension and static Marketplace can both be demonstrated
  without a backend or live scraping.
- Standing reminder: `fixtures/retailer-one` and the fallback demo page exist
  for when a retailer's DOM changes mid-judging. When the adapter or matcher
  changes, re-run against the fixtures. If the fallback page's markup drifts
  from what the adapter now expects, fix it in the same PR.

## 6. Git flow (multiple people/agents committing to this repo concurrently)

- Branch per feature: `feat/<area>-<short-desc>`; `fix/<area>-<short-desc>`
  for bugs; `chore/<short-desc>` for tooling/docs/deps. Keep branches scoped
  to one area (`apps/extension`, `apps/marketplace`, `packages/catalog`,
  `packages/matcher`, `packages/tokens`) to minimize conflicts.
- Conventional commits: `feat: <what>`, `fix: <what>`, `chore: <what>`.
- Before merging to `main`: run `pnpm run catalog:validate`,
  `pnpm run test`, and `pnpm run typecheck` (or `pnpm run build`, which
  chains all three plus both app builds). Don't merge on a failure and "fix
  it after" — a broken `main` blocks everyone immediately.
- No force-pushing `main`. No direct push to `main` that skips the build
  check above, even for a "trivial" change. Never commit `node_modules/`,
  build output (`dist/`), or `.env`/credential files.
