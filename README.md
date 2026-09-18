<div align="center">

<img src="logo.png" alt="Pinkless logo" width="280" />

# Pinkless

**Reviewed product comparisons, right where you shop.**

Pinkless is a Chrome extension and static Marketplace for reviewed product
comparisons. It highlights a product only when a curated catalog contains a
functionally comparable, verified-in-stock alternative that costs less.

![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-ff99d8?logo=googlechrome&logoColor=white)
![Retailer](https://img.shields.io/badge/Retailer-Target-ff99d8)
![Hosting](https://img.shields.io/badge/Marketplace-Vercel-ff99d8?logo=vercel&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-React%20%2B%20Vite-ff99d8?logo=typescript&logoColor=white)

[Scope](#scope) · [Getting started](#getting-started) · [Commands](#commands) ·
[Repository layout](#repository-layout) · [Docs](#docs)

</div>

---

## Scope

|                         | MVP                                                                 |
| ----------------------- | ------------------------------------------------------------------- |
| **Supported retailer**  | Target only                                                         |
| **Marketplace hosting** | Vercel                                                              |
| **Data and matching**   | Local, deterministic, and bundled with the extension                |
| **Not included**        | Accounts, tracking, checkout, live scraping, automated price claims |

## Getting started

### Requirements

- Node.js 20 or newer
- pnpm 9 or newer (Corepack is included with current Node releases)

No environment variables, API keys, or external services are needed to build
the project locally.

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
| `pnpm catalog:validate`  | Validate the comparison catalog           |
| `pnpm build`             | Validate, typecheck, then build both apps |
| `pnpm build:extension`   | Build only the Chrome extension           |
| `pnpm build:marketplace` | Build only the Marketplace                |

## Repository layout

```text
apps/extension/     Chrome Manifest V3 extension (limited to target.com)
apps/marketplace/   Static React/Vite Marketplace for Vercel
packages/catalog/   Reviewer-maintained comparison data and validation
packages/matcher/   Pure matching and savings rules
fixtures/           Sanitized Target-page fixtures (to be added)
```

## Docs

- [Requirements](Files/REQUIREMENTS.md): detailed product and delivery requirements
- [Tasks](Files/TASKS.md): implementation checklist
