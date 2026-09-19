---
name: demo-readiness
description: Use before a hackathon demo, before merging a change that touches the extension/api/matcher/marketplace end-to-end path, or when asked "are we ready to demo" — the §8 acceptance checklist.
---

# Demo readiness

REQUIREMENTS §8's acceptance criteria, as a literal pre-demo checklist. The
demo is not ready until every box is checked — treat this as a gate, not a
suggestion.

## Acceptance checklist (REQUIREMENTS §8)

- [ ] A known supported product shows one correct badge in under three
      seconds **on a warm cache** — measure with the API cache warm, not
      only cold.
- [ ] Its savings equal `women's product regular price - men's/neutral
      product regular price` at the same Kroger store, exactly (integer
      cents, no rounding drift).
- [ ] Clicking the badge opens the expected alternative URL (new tab, no
      host-page navigation).
- [ ] An unknown product stays quiet — no badge.
- [ ] A non-product page (search results, category page, ad, quick-view
      modal) stays quiet.
- [ ] An unavailable (out-of-stock) item stays quiet.
- [ ] A product with no positive savings stays quiet.
- [ ] Changing a supported product's variant updates or removes the badge
      correctly — never leaves a stale one.
- [ ] The Marketplace identifies the Kroger store, price context
      (`in-store`/`store-pickup`), and observed time for every displayed
      offer.
- [ ] Product-identity catalog validation runs cleanly before a build
      (`pnpm run catalog:validate`).
- [ ] Fixture-based tests cover the Kroger page adapter (`apps/extension`),
      the Kroger provider (`apps/api/src/providers`), and the matcher's key
      suppression rules (see `suppress-by-default`).
- [ ] The unpacked extension and Vercel-deployed Marketplace use **only**
      the Pinkless API and Kroger's official API — no page scraping,
      anywhere.

## Standing reminder: keep the fallback path alive

- `fixtures/retailers/` (and any per-provider fixtures under
  `fixtures/providers/`) plus the fallback demo page exist specifically for
  the case where a retailer changes their DOM or inventory mid-judging
  (REQUIREMENTS §2, §7). Don't let them rot:
  - When a page adapter, provider adapter, or matcher changes, re-run
    against the fixtures — don't just eyeball a live page.
  - `PINKLESS_PROVIDER_MODE=mock` should reliably produce a working demo
    path end-to-end at all times; treat a broken mock mode as a
    demo-blocking bug, not a nice-to-have.
  - If the fallback demo page's markup or data drifts from what an adapter
    now expects, fix it in the same PR — it's the safety net for the actual
    judging moment, not a leftover scaffold.
- Before any demo/practice run: confirm the fallback page still produces the
  same one-badge, correct-savings result as the live retailer path, and that
  mock mode still works if any provider's live credentials aren't available.
