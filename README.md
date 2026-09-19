<div align="center">

<img src="logo.png" alt="Pinkless logo" width="280" />

**The men's version, for less — right where you shop.**

Pinkless is a Chrome extension and Marketplace that compares products marketed
to women with reviewed men's or neutral equivalents at the same Kroger store.
It speaks up only when both are priced by Kroger's official API at your
selected store and the men's or neutral version costs less.

![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-ff99d8?logo=googlechrome&logoColor=white)
![Retailer](https://img.shields.io/badge/Retailer-Kroger-ff99d8)
![Hosting](https://img.shields.io/badge/Marketplace-Vercel-ff99d8?logo=vercel&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-React%20%2B%20Vite-ff99d8?logo=typescript&logoColor=white)

[Scope](#scope) · [Getting started](#getting-started) · [Commands](#commands) ·
[Repository layout](#repository-layout) · [Docs](#docs)

</div>

---

## Scope

|                         | MVP                                                                     |
| ----------------------- | ----------------------------------------------------------------------- |
| **Retailer**            | Kroger (official Products and Locations APIs)                           |
| **Comparison**          | Women's product vs reviewed men's/neutral equivalent, same store        |
| **Marketplace hosting** | Vercel                                                                  |
| **Not included**        | Scraping, accounts, tracking, checkout, or fuzzy product matching       |

## Getting started

### Requirements

- Node.js 20 or newer
- pnpm 9 or newer (Corepack is included with current Node releases)

No credentials or external services are needed to build or test the project.
Provider calls fail closed by default. For deterministic local provider data,
copy `.env.example` to `.env.local` and use `PINKLESS_PROVIDER_MODE=mock`.

Live Kroger calls require server-side `KROGER_CLIENT_ID` and
`KROGER_CLIENT_SECRET` values from the Kroger developer portal (Products and
Locations scopes only). Put them in the repo-root `.env` for local work and in
Vercel project settings for deploys; never expose them through a `VITE_`
variable. `pnpm --filter @pinkless/marketplace dev` serves the `api/`
functions from the Vite dev server, so the local Marketplace shows live Kroger
prices when those keys are set.

The Vercel project is not linked yet. When it is created,
`PINKLESS_ALLOWED_ORIGINS` must list the deployed Marketplace origin and the
published `chrome-extension://` origin exactly.

### Install and build

```bash
corepack enable
pnpm install
pnpm build
```

### Run the Marketplace

```bash
pnpm --filter @pinkless/marketplace dev
```

### Run the controlled fallback demo

```bash
pnpm --filter @pinkless/demo dev
```

Then open `http://localhost:4174/product/cvs` (or `kroger` or `walmart`). See
the [fallback demo guide](apps/demo/README.md) for the incognito rehearsal.

### Try the extension

1. Run `pnpm build:extension`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select `apps/extension/dist`.

See the [extension guide](apps/extension/README.md) for local API, store-selection,
and browser-testing details.

## Commands

| Command                  | What it does                              |
| ------------------------ | ----------------------------------------- |
| `pnpm format`            | Check formatting                          |
| `pnpm typecheck`         | Check TypeScript                          |
| `pnpm test`              | Run unit tests                            |
| `pnpm catalog:validate`  | Validate the product identity catalog     |
| `pnpm build`             | Validate, typecheck, then build both apps |
| `pnpm build:extension`   | Build only the Chrome extension           |
| `pnpm build:demo`        | Build only the controlled fallback demo   |
| `pnpm build:marketplace` | Build only the Marketplace                |

## Repository layout

```text
api/                Thin Vercel Function entry points for comparison and stores
apps/api/           Provider contracts and server-only retailer integrations
apps/extension/     Chrome MV3 extension, retailer adapters, popup, and badge
apps/demo/          Controlled static fallback product page for judging
apps/marketplace/   Static React/Vite Marketplace for Vercel
packages/catalog/   Products, reviewed women's→men's/neutral pairs, and validation
packages/matcher/   Pure matching and savings rules
fixtures/           Sanitized retailer, catalog, and provider fixtures
```

## API contracts

- `GET /api/stores?postalCode=45202` returns nearby Kroger stores.
- `POST /api/compare` accepts `{ current }`, a normalized Kroger product view
  including the selected store (`locationId`) and price context. The API
  prices the product and its reviewed equivalents at that store itself.
- `GET /api/comparisons?locationId=01400513&priceContext=in-store` lists every
  reviewed pair where the men's or neutral product costs less at that store.
- All routes enforce an exact origin allowlist. Production suppression and
  no-match responses omit diagnostic reason codes.

## Docs

- [Local development](LOCAL_DEVELOPMENT.md): run the Marketplace, API, and unpacked Chrome extension
- [Requirements](Files/REQUIREMENTS.md): detailed product and delivery requirements
- [Tasks](Files/TASKS.md): implementation checklist

Hello
