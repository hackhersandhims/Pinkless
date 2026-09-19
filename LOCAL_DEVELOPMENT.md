# Using Pinkless locally

## Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer
- Google Chrome

From the repository root, install dependencies:

```sh
corepack enable
pnpm install
```

## Run the Marketplace

Start the Vite development server:

```sh
pnpm --filter @pinkless/marketplace dev
```

Open <http://localhost:5173>. The Marketplace uses local fixture data until its
production API feed is available, so no credentials are required.

## Run the local API

Copy `.env.example` to `.env.local`, then set mock mode and allow both the
Marketplace and unpacked extension origins:

```dotenv
PINKLESS_PROVIDER_MODE=mock
PINKLESS_ALLOWED_ORIGINS=http://localhost:5173,chrome-extension://YOUR_EXTENSION_ID
```

Find `YOUR_EXTENSION_ID` on `chrome://extensions` after loading the extension.
Restart the API whenever this environment file changes.

### Test Canopy REST locally

To use live Amazon data instead of fixtures, change the copied `.env.local`
file to:

```dotenv
PINKLESS_PROVIDER_MODE=live
PINKLESS_ALLOWED_ORIGINS=http://localhost:5173,chrome-extension://YOUR_EXTENSION_ID
CANOPY_API_KEY=
KROGER_CLIENT_ID=
KROGER_CLIENT_SECRET=
```

Paste the Canopy key after `CANOPY_API_KEY=` in `.env.local` only. Live mode
uses `GET https://rest.canopyapi.co/api/amazon/product` with `domain=US`; the
key remains in the API process and is never sent to the extension. Kroger,
CVS, and Walmart remain fail-closed when their credentials or integrations are
not configured.

The Amazon page must match a real reviewed ASIN pair in
`packages/catalog/products.json`. The bundled `B000000001` and `B000000002`
records are deterministic demo identities, so replace them with reviewed real
ASINs before expecting a live Canopy comparison.

In a second terminal, run the Vercel Functions locally on port 3000:

```sh
pnpm dlx vercel dev --listen 3000
```

The first run may ask you to sign in to Vercel and configure a local project.
The extension currently expects the API at `http://localhost:3000`.

## Build and load the Chrome extension

Build it from the repository root:

```sh
pnpm build:extension
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Select `apps/extension/dist` — not `apps/extension`.
5. Open Chrome's Extensions menu and pin **Pinkless**.
6. Open Pinkless, enter a US ZIP code, and select nearby stores.

The mock provider includes stores for ZIP code `45202`. Pinkless runs only on
Amazon, CVS, Kroger, and Walmart HTTPS pages, plus the path-locked controlled
fallback routes at `http://localhost:4174/product/{cvs|kroger|walmart}`. A normal
retailer product can remain quiet when it is not an exact reviewed catalog
match; silence is expected for unknown, unavailable, or non-cheaper products.

## Rehearse the controlled fallback

In a third terminal, run:

```sh
pnpm --filter @pinkless/demo dev
```

Open `http://localhost:4174/product/cvs` in an incognito Chrome profile after
enabling the unpacked extension for incognito. The page lists deterministic
CVS, Kroger, and Walmart mock offers. Its **Price variant** control changes the
current price and should cause the extension to update or remove its badge
after one debounced recomputation.

## Reload after making changes

For Marketplace changes, Vite reloads the page automatically.

For extension changes:

1. Run `pnpm build:extension` again.
2. Open `chrome://extensions`.
3. Select **Reload** on the Pinkless card.
4. Refresh the retailer tab.

If the popup cannot find stores, verify that the local API is running, the
extension ID is present in `PINKLESS_ALLOWED_ORIGINS`, and the API was restarted
after editing `.env.local`.

## Verify the project

```sh
pnpm catalog:validate
pnpm typecheck
pnpm test
pnpm build
```

Do not add retailer credentials to extension code or commit `.env.local`.
