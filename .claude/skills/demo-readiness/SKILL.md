---
name: demo-readiness
description: Use before a hackathon demo, before merging a change that touches the extension/matcher/marketplace end-to-end path, or when asked "are we ready to demo" — the §8 acceptance checklist.
---

# Demo readiness

REQUIREMENTS §8's acceptance criteria, as a literal pre-demo checklist. The
demo is not ready until every box is checked — treat this as a gate, not a
suggestion.

## Acceptance checklist (REQUIREMENTS §8)

- [ ] A known supported product shows exactly one correct badge in under
      three seconds.
- [ ] Its savings equal `current target price - catalog alternative price`
      exactly (integer cents, no rounding drift).
- [ ] Clicking the badge opens the expected alternative URL (new tab, no
      host-page navigation).
- [ ] An unknown product stays quiet — no badge.
- [ ] A non-product page (search results, category page, ad, quick-view
      modal) stays quiet.
- [ ] An unavailable (out-of-stock) item stays quiet.
- [ ] A product with no positive savings stays quiet.
- [ ] Changing a supported product's variant updates or removes the badge
      correctly — never leaves a stale one.
- [ ] The Marketplace shows every `active` catalog record exactly once,
      grouped by category, with savings, rationale, and verification date.
- [ ] Catalog validation (`pnpm run catalog:validate`) runs cleanly.
- [ ] Fixture-based tests cover every retailer adapter and the matcher's key
      suppression rules (see `suppress-by-default` skill for the rule list).
- [ ] The unpacked extension and the static Marketplace can both be
      demonstrated without a backend or live scraping.

## Standing reminder: keep the fallback path alive

- `fixtures/retailer-one` and the fallback demo page exist specifically for
  the case where a retailer changes their DOM or inventory mid-judging
  (REQUIREMENTS §2, §7). Don't let them rot:
  - When the adapter or matcher changes, re-run against the fixtures, don't
    just eyeball a live page.
  - If the fallback demo page's markup or data drifts from what the adapter
    now expects, fix it in the same PR — it's the safety net for the actual
    judging moment, not a leftover scaffold.
- Before any demo/practice run: confirm the fallback page still produces the
  same one-badge, correct-savings result as the live retailer path.
