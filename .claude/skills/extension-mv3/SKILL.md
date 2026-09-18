---
name: extension-mv3
description: Use when writing or reviewing anything in apps/extension — manifest, content scripts, adapters, or the badge mount/observer logic.
---

# Extension MV3 rules

Applies to `apps/extension/**`. This is the hairy part of the system —
REQUIREMENTS §3, §6, §7 are the ground truth; when in doubt, re-read them
before improvising.

## Content script scoping

- The content script must run **only** on declared supported retailer domains
  — declare them explicitly in `manifest.json`'s `content_scripts.matches`,
  never a wildcard broader than the supported retailer(s).
- One adapter per retailer. An adapter's only job is to extract a normalized
  `ProductView` from the current page:

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

- Add a second retailer adapter only once the first is reliable
  (REQUIREMENTS §2) — don't build multi-retailer abstractions speculatively.

## Re-evaluation: debounced MutationObserver

- Product pages change variant or navigate client-side without a full page
  load. Watch for this with a **debounced** `MutationObserver` — never
  recompute on every mutation event; debounce so a burst of DOM churn
  triggers one recomputation, not many.
- On every recompute: never leave a stale savings badge visible. If the new
  state doesn't pass all checks, remove/hide the badge; if it does, update it
  in place.
- Selected-variant changes must update or remove the badge — a badge showing
  savings for a variant the user is no longer viewing is a correctness bug.

## Single badge invariant

- Render **exactly one** badge, ever, inside a Shadow DOM root.
- Use a fixed, unique root element ID (see `BADGE_ROOT_ID` in
  `apps/extension/src/content/index.ts`). On remount, **replace** the
  existing root's contents — never `appendChild` a second badge instance.
- See `frontend-craft` skill for how tokens get inlined into that shadow
  root's `<style>`.

## Zero network, zero transmission

- The extension must not transmit product title, price, URL, or browsing
  history anywhere — no `fetch`, no `XMLHttpRequest`, no beacon, no
  analytics call from the content script or popup.
- All catalog data (`packages/catalog`) ships bundled with the extension at
  build time. Never fetch the catalog, or any remote config, at runtime.
- The only outbound network action allowed is the user explicitly clicking
  "See alternative," which opens a new tab to a known URL — that's a browser
  navigation, not a script-initiated network call.

## Matching stays in `packages/matcher`

- The content script calls into `packages/matcher` for identity/eligibility/
  price logic. Don't duplicate matching or suppression logic inline in the
  content script — see the `catalog-and-matcher` and `suppress-by-default`
  skills for those rules.
