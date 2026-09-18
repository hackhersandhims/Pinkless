# Pinkless

Pinkless is a Chrome extension and static Marketplace for reviewed product
comparisons. It highlights a product only when a curated catalog contains a
functionally comparable, verified-in-stock alternative that costs less.

## Current scope

- **Supported retailer:** Target only
- **Marketplace hosting:** Vercel
- **Data and matching:** local, deterministic, and bundled with the extension
- **Not in the MVP:** accounts, tracking, checkout, live scraping, or automated
  price-discrimination claims

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer (Corepack is included with current Node releases)

No environment variables, API keys, or external services are needed to build
the project locally.

## Local setup

```bash
corepack enable
pnpm install
pnpm build
```

Useful commands:

```bash
pnpm format        # check formatting
pnpm typecheck     # check TypeScript
pnpm test          # run unit tests
pnpm catalog:validate
pnpm build         # validate, typecheck, then build both apps
```

To run the Marketplace locally:

```bash
pnpm --filter @pinkless/marketplace dev
```

To test the extension, run `pnpm build:extension`, then open Chrome’s
`chrome://extensions`, enable Developer mode, choose **Load unpacked**, and
select `apps/extension/dist`.

## Repository layout

```text
apps/extension/     Chrome Manifest V3 extension (limited to target.com)
apps/marketplace/   Static React/Vite Marketplace for Vercel
packages/catalog/   Reviewer-maintained comparison data and validation
packages/matcher/   Pure matching and savings rules
fixtures/           Sanitized Target-page fixtures (to be added)
```

The detailed product and delivery requirements are in
[Files/REQUIREMENTS.md](Files/REQUIREMENTS.md), with the implementation
checklist in [Files/TASKS.md](Files/TASKS.md).
