---
name: suppress-by-default
description: Use when writing or reviewing any logic that decides whether the badge renders — matcher eligibility checks, adapter extraction, or badge mount conditions. The default is silence.
---

# Suppress by default

Silence is the default (REQUIREMENTS §1). The product's entire trust promise
depends on this: "We found a verified comparable alternative that was priced
lower when last checked." A weak match, unknown price, unavailable
alternative, or non-positive savings must **never** produce a badge. When a
change makes the badge render in more situations, that's a regression unless
it's backed by a reviewed catalog record.

## The edge-case table (REQUIREMENTS §7) — enforce every row

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

## Checklist for any PR touching matcher/adapter/badge logic

- [ ] Does this change ever make the badge render for a sale/coupon/
      membership/subscription/"from" price? It must not, unless the adapter
      can isolate an ordinary one-time price.
- [ ] Does this change handle a price range or unparseable currency by
      suppressing, not guessing a value?
- [ ] Is a zero-or-negative-savings case still `no-match`?
- [ ] Does a size/bundle/pack-count/condition mismatch suppress unless an
      explicit reviewed catalog record covers it?
- [ ] Does out-of-stock (target or alternative) suppress?
- [ ] Are third-party marketplace sellers excluded rather than matched?
- [ ] Does this change avoid rendering on ad/search-result/category/
      quick-view pages?
- [ ] If the retailer's DOM is unexpected or data is incomplete, does it
      suppress and log a dev-only diagnostic rather than guessing or
      throwing a user-visible error?
- [ ] On a client-side route or variant change, is the previous badge
      recomputed (debounced) rather than left stale?
- [ ] Is UI mount idempotent — a fixed unique root ID, replaced not
      appended, so no duplicate badge can appear?
- [ ] Does stale `verifiedAt` data stay off the Marketplace/badge until a
      maintainer re-verifies or pauses the record, rather than being shown
      as current?
- [ ] Is a comparison with ambiguous gender marketing kept unpublished until
      a reviewer documents the rationale?

## Default behavior for anything not on this table

If a situation isn't explicitly covered above or by a reviewed catalog
record: **suppress**. Never add a "best guess" fallback, a fuzzy match, or a
permissive default "just to make the demo look more populated." An
under-triggering badge is a missed demo moment; an over-triggering badge is a
trust violation and explicitly out of scope (REQUIREMENTS §2).
