# Pinkless Chrome extension

## Build and load unpacked

1. Run `pnpm build:extension` from the repository root.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Choose **Load unpacked** and select `apps/extension/dist`.
4. Pin Pinkless, open its popup, and enter a US ZIP code.

The unpacked build runs only on explicitly declared CVS, Kroger, and Walmart
HTTPS pages, plus the fixed team-owned local fallback routes at
`http://localhost:4174/product/{cvs|kroger|walmart}`. It requests no browsing
history and stores only the ZIP code and explicit retailer store IDs selected
in the popup.

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

- Supported exact products may show one Shadow DOM badge after the API returns
  a verified cheaper offer.
- Unknown, incomplete, promotional, unavailable, expired, or non-cheaper
  results stay quiet.
- Variant or client-side route changes clear the prior result immediately and
  trigger one debounced recomputation.
- `See alternative` opens the reviewed retailer URL in a new tab; `Not now`
  hides the badge for the current page only.

## Controlled fallback rehearsal

Start `pnpm --filter @pinkless/demo dev`, then use the procedure in
[`apps/demo/README.md`](../demo/README.md). The demo host is intentionally
path-locked; do not turn it into a general localhost content-script match.
