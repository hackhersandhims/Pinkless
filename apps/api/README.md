# Private Gemini reviewer endpoint

`POST /api/review/candidates` drafts structured women’s-to-men’s/neutral candidate pairs from
reviewer-supplied Kroger product metadata. It is not part of the extension or Marketplace API.
It cannot write catalog data, calculate savings, or make a badge appear.

## Configure

Set these server-only values in `.env.local` for local development and in the Vercel Marketplace
project for deployed use:

```text
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
PINKLESS_REVIEW_API_TOKEN=your-long-random-reviewer-token
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

Before adding any returned candidate to `products.json` and `equivalences.json`, a reviewer must
verify the listings, category, size, pack count, rationale, and known differences.
