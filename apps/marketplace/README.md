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

`src/lib/api.ts` exports `loadComparisons()`, which returns a
`ComparisonsResponse` list feed (`src/lib/types.ts`) regardless of where the
data comes from:

- If `VITE_PINKLESS_API_URL` is set, it fetches
  `${VITE_PINKLESS_API_URL}/api/comparisons`.
- Otherwise, it builds the feed **locally** from
  `packages/catalog/products.json` (product identity only, no prices) plus
  `src/lib/fixtures/mock-offers.json` (mocked provider offers). Every
  candidate goes through `compareOffers()` from `packages/matcher`, the same
  function behind `POST /api/compare`, so the Marketplace can never list a
  comparison the extension would suppress.

**There is no list endpoint yet.** The Phase 2 API answers one product view
at a time (`POST /api/compare`), which suits the extension but not a
browsable feed. Until `GET /api/comparisons` exists, leave
`VITE_PINKLESS_API_URL` unset; setting it now fetches a route that 404s.

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

These settings deploy the Marketplace as its own project. The API's Vercel
Functions live in the repo-root `api/` directory, which this project cannot
see, so they need a separate project rooted at the repo root (or one
repo-root project that serves both). Leave `VITE_PINKLESS_API_URL` unset until
a list endpoint exists.
