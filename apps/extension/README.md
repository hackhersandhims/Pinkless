# Pinkless Chrome extension

## Build and load unpacked

1. Run `pnpm build:extension` from the repository root.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Choose **Load unpacked** and select `apps/extension/dist`.
4. Pin Pinkless, click its icon to open the Chrome Side Panel, enter a US ZIP
   code, and choose a Kroger store. With no store selected the extension stays
   quiet.

The unpacked build runs only on `https://www.kroger.com/*` (the adapter acts
only on `/p/<slug>/<productId>` product pages) plus the fixed team-owned local
fallback route `http://localhost:4174/product/kroger`. It requests no browsing
history and stores only the ZIP code and the chosen Kroger store on this
device. A comparison request sends exactly `{ current }`: the page's product
identity with the selected store's `locationId` and `priceContext: "in-store"`.

## Local API setup

Until Phase 7 creates the Vercel deployment, the extension calls
`http://localhost:3000` and the Marketplace link opens
`http://localhost:5173`. Run the API in mock-provider mode and add the unpacked
extension origin shown on `chrome://extensions` to `PINKLESS_ALLOWED_ORIGINS`:

```dotenv
PINKLESS_PROVIDER_MODE=mock
PINKLESS_ALLOWED_ORIGINS=chrome-extension://your-extension-id
```

After Vercel exists, replace the two local URLs in
`src/shared/config.ts`, add the exact API host to `public/manifest.json`, and
configure the production origin allowlist before publishing.

## Expected behavior

- On a reviewed women's product, one Shadow DOM badge may appear when the API
  prices its reviewed men's or neutral equivalent lower at the selected store.
  It names the equivalent and its price, the rationale, the first known
  difference, the store, and the date checked.
- Unknown, incomplete, promotional, unavailable, expired, page-price mismatch,
  no-store, or non-cheaper results stay quiet.
- Variant or client-side route changes clear the prior result immediately and
  trigger one debounced recomputation.
- `See alternative` opens the equivalent's Kroger page in a new tab; `Not now`
  hides the badge for the current page only.

## Controlled fallback rehearsal

Start `pnpm --filter @pinkless/demo dev`, then use the procedure in
[`apps/demo/README.md`](../demo/README.md). The demo host is intentionally
path-locked; do not turn it into a general localhost content-script match.
