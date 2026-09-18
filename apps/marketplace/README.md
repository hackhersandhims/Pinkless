# Pinkless Marketplace

The Vercel-deployed React site: category index, comparison cards, a
comparison detail view, and outbound links to the alternative retailer. It
reads the same read-only comparison API the Chrome extension uses
(REQUIREMENTS §3, §6).

## Running locally

This workspace uses `pnpm@11.21.0`. If `pnpm` isn't on your `PATH`, prefix
every command with `npx --yes pnpm@11.21.0` instead of `pnpm` (e.g.
`npx --yes pnpm@11.21.0 --filter @pinkless/marketplace dev`).

From the repo root:

```sh
pnpm --filter @pinkless/marketplace dev       # start the dev server
pnpm --filter @pinkless/marketplace test      # run the vitest suite
pnpm --filter @pinkless/marketplace build     # typecheck + production build
```

Or from `apps/marketplace/`: `pnpm dev`, `pnpm test`, `pnpm build`.

Root-level scripts that also touch this app:

```sh
pnpm run catalog:validate   # validate packages/catalog/products.json
pnpm run build              # catalog validate + typecheck + both app builds
```

## The data seam

`src/lib/api.ts` exports `loadComparisons()`, which returns the same
`ComparisonsResponse` shape (`packages/matcher/src/comparison.ts`) regardless
of where the data comes from:

- If `VITE_PINKLESS_API_URL` is set, it fetches `${VITE_PINKLESS_API_URL}/comparisons`
  from the real Pinkless comparison API.
- Otherwise, it builds the identical response **locally**, from
  `packages/catalog/products.json` (product identity only, no prices) plus
  `src/lib/fixtures/mock-offers.json` (mocked provider offers), applying the
  same same-price-context, positive-savings rules the real API will enforce.

**The Phase 2 comparison API (`apps/api`) does not exist yet.** Until it
ships, the Marketplace always runs in local-build mode. Set
`VITE_PINKLESS_API_URL` only once that route is live; no other code changes
should be required to switch over.

The catalog never stores a price — every price in a `ComparisonView` comes
from an observed `Offer`/`ComparisonOffer`. "Alternative" always means the
same packaged product (same UPC) at a second retailer, not a different
product.

## Deploying on Vercel

- **Root directory:** `apps/marketplace`
- **Install command:** `pnpm install` (run at the repo root, so workspace
  dependencies in `packages/*` resolve)
- **Build command:** `pnpm --filter @pinkless/marketplace build`
- **Output directory:** `dist`
- **Node version:** 22

Set `VITE_PINKLESS_API_URL` as a Vercel environment variable once the Phase 2
API is deployed; leave it unset to keep serving the local-build fallback.
