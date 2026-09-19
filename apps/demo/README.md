# Controlled fallback demo

The team-owned fallback page for judging when kroger.com's DOM changes or is
unreachable. It is a clearly labelled stand-in for one Kroger product page —
BIC Soleil Smooth Scented Disposable 3-Blade Razors (Kroger productId
`0007033071417`, $6.79) — and publishes the same signals the extension reads on
kroger.com: a canonical `https://www.kroger.com/p/...` link and one schema.org
`Product`/`Offer`. The extension runs the same extraction code on it as on the
live site (contract test: `apps/extension/src/adapters/demo.test.ts`).

## Run it locally

```sh
pnpm --filter @pinkless/demo dev
```

Open the only supported route: `http://localhost:4174/product/kroger`.

The **Demo scenario** control switches the page in place, the way a retailer
single-page app would:

- **Regular price** ($6.79): the badge can show the reviewed men's equivalent.
- **Different page price** ($5.49): the API reports a page-price mismatch and
  the badge must disappear.
- **Out of stock**: the badge must disappear.

The page never creates a badge or fetches a price itself.

## Rehearsal prerequisites

1. Start the API in `PINKLESS_PROVIDER_MODE=mock` and allow the unpacked
   extension origin in `PINKLESS_ALLOWED_ORIGINS`.
2. Build and load `apps/extension/dist`, search ZIP `45202`, and choose
   "Kroger Downtown (fixture)" in the popup.
3. Open `http://localhost:4174/product/kroger`.

The extension allows only this fixed local route in addition to
`www.kroger.com`. Do not broaden the localhost pattern. A public deployment
needs a separate manifest review and an exact host/path allowlist before it can
replace this controlled local fallback.
