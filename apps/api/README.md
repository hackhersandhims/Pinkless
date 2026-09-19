# Private Gemini reviewer endpoint

`POST /api/review/candidates` drafts structured women’s-to-men’s/neutral candidate pairs. It is
not part of the extension or Marketplace shopper API. It cannot write catalog data, calculate
savings, or make a badge appear.

The endpoint supports two input modes:

- `products`: draft from complete reviewer-supplied metadata.
- `krogerProducts`: import names, brands, UPCs, and reported sizes from Kroger's official API,
  then draft from that verified metadata plus the reviewer's category, size, variant, and
  marketing classifications.

## Configure

Set these server-only values in `.env.local` for local development and in the Vercel Marketplace
project for deployed use:

```text
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
PINKLESS_REVIEW_API_TOKEN=your-long-random-reviewer-token
KROGER_CLIENT_ID=your-kroger-client-id
KROGER_CLIENT_SECRET=your-kroger-client-secret
```

`PINKLESS_REVIEW_API_TOKEN` is separate from the Gemini key. Do not use a `VITE_` prefix or put
either value in the extension, browser code, or a committed file.

## Draft candidates

Call the private endpoint with the reviewer token. Product indexes in the response refer to their
positions in the supplied `products` array.

```sh
curl -X POST https://pinkless-marketplace.vercel.app/api/review/candidates \
  -H "Authorization: Bearer $PINKLESS_REVIEW_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "products": [
      {
        "name": "Example women’s razor",
        "category": "razors",
        "size": { "amount": 4, "unit": "count" },
        "marketedTo": "women"
      },
      {
        "name": "Example neutral razor",
        "category": "razors",
        "size": { "amount": 4, "unit": "count" },
        "marketedTo": "neutral"
      }
    ]
  }'
```

## Import official Kroger metadata, then draft

Use `krogerProducts` to expand catalog coverage without copying names, brands, or UPCs by hand.
The product ID must be the exact 13-digit ID at the end of its canonical Kroger URL. The reviewer
still supplies the fields Kroger cannot safely decide for Pinkless: normalized variant, category,
size, and who the listing markets the item to.

For local use, run the Marketplace dev server and call `http://localhost:5173/api/review/candidates`.
Set `PINKLESS_PROVIDER_MODE=live` (or omit it) so the importer uses the configured Kroger API;
mock mode can only resolve products already in the local fixture catalog.

```sh
curl -X POST https://pinkless-marketplace.vercel.app/api/review/candidates \
  -H "Authorization: Bearer $PINKLESS_REVIEW_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "krogerProducts": [
      {
        "productId": "0007033071417",
        "canonicalUrl": "https://www.kroger.com/p/bic-soleil-smooth-scented-disposable-3-blade-razors/0007033071417",
        "variant": "3-blade disposable razor, 4 count",
        "category": "razors",
        "size": { "amount": 4, "unit": "count" },
        "marketedTo": "women"
      },
      {
        "productId": "0007033071397",
        "canonicalUrl": "https://www.kroger.com/p/bic-comfort-3-advance-disposable-razors/0007033071397",
        "variant": "3-blade disposable razor, 4 count",
        "category": "razors",
        "size": { "amount": 4, "unit": "count" },
        "marketedTo": "men"
      }
    ]
  }'
```

The response includes `source: "kroger-official-api"`, the normalized `products` sent to Gemini,
and the filtered candidate list. `sourceSize` preserves Kroger's own size string so the reviewer
can compare it with the normalized size before approving anything.

## Approve a candidate

Before adding any returned candidate to `products.json` and `equivalences.json`, a reviewer must
verify the listings, category, size, pack count, formula or construction, rationale, and known
differences. Then add or update the two product records and their equivalence, record the real
reviewer and review date, and run:

```sh
pnpm run catalog:validate
pnpm run test
pnpm run typecheck
```

Only that reviewed catalog change makes the candidate available to both the Marketplace and the
extension.
