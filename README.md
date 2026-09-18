<div align="center">

<img src="logo.png" alt="Pinkless logo" width="280" />

**Reviewed product comparisons, right where you shop.**

Pinkless is a Chrome extension and static Marketplace for reviewed product
comparisons. It highlights a product only when an approved provider reports the
same exact packaged item, verified in stock, for less at another retailer.

![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-ff99d8?logo=googlechrome&logoColor=white)
![Retailers](https://img.shields.io/badge/Retailers-CVS%20%7C%20Kroger%20%7C%20Walmart-ff99d8)
![Hosting](https://img.shields.io/badge/Marketplace-Vercel-ff99d8?logo=vercel&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-React%20%2B%20Vite-ff99d8?logo=typescript&logoColor=white)

[Scope](#scope) · [Getting started](#getting-started) · [Commands](#commands) ·
[Repository layout](#repository-layout) · [Docs](#docs)

</div>

---

## Scope

|                         | MVP                                                                     |
| ----------------------- | ----------------------------------------------------------------------- |
| **Retailer network**    | CVS, Kroger, and Walmart                                                |
| **Marketplace hosting** | Vercel                                                                  |
| **Data and matching**   | Exact UPC/retailer identity via approved APIs or licensed provider data |
| **Not included**        | Scraping, accounts, tracking, checkout, or fuzzy product matching       |

## Getting started

### Requirements

- Node.js 20 or newer
- pnpm 9 or newer (Corepack is included with current Node releases)

No credentials or external services are needed to build or test the project.
Provider calls fail closed by default. For deterministic local provider data,
copy `.env.example` to `.env.local` and use `PINKLESS_PROVIDER_MODE=mock`.

Live Kroger calls require server-side `KROGER_CLIENT_ID` and
`KROGER_CLIENT_SECRET` values from the Kroger developer portal. Configure them
in Vercel project settings and never expose them through a `VITE_` variable.
CVS and Walmart intentionally remain unavailable until approved or licensed
product-and-price integrations are implemented.

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

### Try the extension

1. Run `pnpm build:extension`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select `apps/extension/dist`.

## Commands

| Command                  | What it does                              |
| ------------------------ | ----------------------------------------- |
| `pnpm format`            | Check formatting                          |
| `pnpm typecheck`         | Check TypeScript                          |
| `pnpm test`              | Run unit tests                            |
| `pnpm catalog:validate`  | Validate the product identity catalog     |
| `pnpm build`             | Validate, typecheck, then build both apps |
| `pnpm build:extension`   | Build only the Chrome extension           |
| `pnpm build:marketplace` | Build only the Marketplace                |

## Repository layout

```text
apps/api/           Provider contracts and server-only retailer integrations
apps/extension/     Chrome Manifest V3 extension (page adapters added later)
apps/marketplace/   Static React/Vite Marketplace for Vercel
packages/catalog/   Canonical product identity data and validation
packages/matcher/   Pure matching and savings rules
fixtures/           Sanitized catalog and provider contract fixtures
```

## Docs

- [Requirements](Files/REQUIREMENTS.md): detailed product and delivery requirements
- [Tasks](Files/TASKS.md): implementation checklist
