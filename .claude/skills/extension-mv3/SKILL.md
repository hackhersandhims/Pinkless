---
name: extension-mv3
description: Use when writing or reviewing anything in apps/extension — manifest, content scripts, page adapters, or the badge mount/observer logic, and its call into apps/api.
---

# Extension MV3 rules

Applies to `apps/extension/**`. REQUIREMENTS §3, §6, §7 are the ground truth;
when in doubt, re-read them before improvising. The extension is a thin
client: it extracts page identity and renders offers — it does not fetch,
score, or invent prices itself. All retailer calls happen server-side in
`apps/api` (see the `catalog-and-matcher` skill for provider-adapter rules).

## Content script scoping

- The content script runs **only** on declared CVS, Kroger, and Walmart
  domains — explicit `matches` entries in `manifest.json`, never a wildcard
  broader than the three supported retailers.
- One page adapter per retailer, extracting a normalized `ProductView`:

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

## Extension ↔ API boundary

- The extension must **never** contain retailer credentials
  (`KROGER_CLIENT_ID`, etc.) or request arbitrary page history.
- It may send only the current product identity and selected retailer/store
  location to the Pinkless API (`apps/api`) solely to obtain a comparison.
  Don't add any other outbound call.
- Render only the eligible cross-retailer offers the API returns — the
  content script does not itself decide savings eligibility beyond basic
  price/availability sanity checks already covered by the matcher
  (`packages/matcher`), and must not fetch or scrape a second retailer's page
  to cross-check a price.
- No analytics/telemetry call from the content script or popup. The only
  outbound network action a person triggers is clicking "See alternative,"
  which opens a new tab — a browser navigation, not a script-initiated call.

## Re-evaluation: debounced MutationObserver

- Product pages change variant or navigate client-side without a full page
  load. Watch for this with a **debounced** `MutationObserver` — debounce so
  a burst of DOM churn triggers one recomputation, not many.
- On every recompute: never leave a stale savings badge visible. If the new
  state doesn't pass all checks, remove/hide the badge; if it does, update it
  in place.
- Selected-variant changes must update or remove the badge.

## Single badge invariant

- Render **exactly one** badge, ever, inside a Shadow DOM root.
- Use a fixed, unique root element ID (see `BADGE_ROOT_ID` in
  `apps/extension/src/content/index.ts`). On remount, **replace** the
  existing root's contents — never `appendChild` a second badge instance.
- See the `frontend-craft` skill for how tokens get inlined into that shadow
  root's `<style>`.

## Matching stays out of the content script

- The content script calls into `packages/matcher` / the API for
  identity/eligibility/price logic. Don't duplicate matching or suppression
  logic inline — see the `catalog-and-matcher` and `suppress-by-default`
  skills for those rules.
