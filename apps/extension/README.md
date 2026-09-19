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

## API setup

The production build calls `https://pinkless-marketplace.vercel.app` for both
the Pinkless API and Marketplace. In the Vercel project, set
`PINKLESS_ALLOWED_ORIGINS` to an exact comma-separated list containing the
Marketplace origin and the unpacked extension origin shown on
`chrome://extensions`:

```dotenv
PINKLESS_ALLOWED_ORIGINS=https://pinkless-marketplace.vercel.app,chrome-extension://your-extension-id
```

After changing the Vercel environment variable, redeploy the production
deployment so its serverless functions receive the new value. For local API
development, see [`LOCAL_DEVELOPMENT.md`](../../LOCAL_DEVELOPMENT.md).

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
