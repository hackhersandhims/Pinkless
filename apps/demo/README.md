# Controlled fallback demo

This is Pinkless's team-owned Phase 5 product page. It is deliberately not a
retailer lookalike: it exposes clear, deterministic mock data for the same
normalized product fields used by a retailer adapter.

## Run it locally

```sh
pnpm --filter @pinkless/demo dev
```

Open one of the only supported routes:

- `http://localhost:4174/product/cvs`
- `http://localhost:4174/product/kroger`
- `http://localhost:4174/product/walmart`

The **Price variant** control changes the current price in the controlled
product metadata. The extension's normal debounced observer must either update
the badge or remove it; the demo page does not create a badge itself.

## Rehearsal prerequisites

1. Start the API in `PINKLESS_PROVIDER_MODE=mock` and allow the unpacked
   extension origin in `PINKLESS_ALLOWED_ORIGINS`.
2. Build and load `apps/extension/dist`, select ZIP `45202`, and choose each
   mock retailer store in the popup.
3. Use a fresh Chrome incognito profile with the extension explicitly enabled
   for incognito, then open a supported route above.

The extension allows only these fixed local routes in addition to CVS, Kroger,
and Walmart. Do not broaden the localhost pattern. A public deployment needs a
separate manifest review and an exact host/path allowlist before it can replace
this controlled local fallback.
