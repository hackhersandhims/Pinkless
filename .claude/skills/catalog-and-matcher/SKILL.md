---
name: catalog-and-matcher
description: Use when writing or reviewing packages/catalog, packages/matcher, or any code that reads/validates/matches a Comparison record — this is the product's trust boundary.
---

# Catalog and matcher

Applies to `packages/catalog/**` and `packages/matcher/**`, and any code that
constructs, validates, or consumes a `Comparison`. Catalog data is the
product's trust boundary (REQUIREMENTS §4) — treat every rule here as a hard
constraint, not a style preference.

## Money is always integer cents

- All monetary amounts are integer minor units in USD: `amountCents`.
- **Never** use a floating-point value for money, anywhere — not in the
  catalog, not in the matcher, not in display formatting math.
- Flag any PR that introduces a `number` price that isn't explicitly integer
  cents, or that does arithmetic on prices using floats (e.g. dividing by 100
  and doing float math before converting back).

## Exact shared types (REQUIREMENTS §4)

```ts
type Money = {
  amountCents: number;
  currency: "USD";
};

type Size = {
  amount: number;
  unit: "oz" | "ml" | "count";
};

type TargetListing = {
  retailer: string;
  productId?: string;
  canonicalUrlPatterns: string[];
  name: string;
  brand?: string;
  variant: string;
  marketedAs: "women" | "men" | "unisex";
  size: Size;
};

type AlternativeListing = {
  retailer: string;
  url: string;
  name: string;
  price: Money;
  size: Size;
  condition: "new";
  availability: "verified-in-stock";
};

type Comparison = {
  id: string;
  category: "razors" | "deodorant" | "body-wash";
  target: TargetListing;
  alternative: AlternativeListing;
  equivalence: {
    rationale: string;
    matchedAttributes: string[];
    knownDifferences?: string[];
  };
  evidence: {
    verifiedAt: string; // ISO date
    sourceUrls: string[];
  };
  status: "active" | "paused" | "retired";
};
```

Don't add fields, loosen types, or make required fields optional without
updating this skill and `REQUIREMENTS.md` in the same PR.

## Catalog validation — every rejection rule

`packages/catalog` validation must reject a record for any of these
(checklist — a new catalog validator or schema change must still enforce
all of them):

- [ ] Duplicate comparison IDs.
- [ ] An `active` record without one canonical target identifier
      (`productId` or a `canonicalUrlPatterns` entry).
- [ ] Empty `equivalence.rationale` or empty `evidence.sourceUrls`.
- [ ] Invalid sizes, prices, dates, currency, or alternative URL.
- [ ] An alternative whose `condition` isn't `"new"` or whose `availability`
      isn't `"verified-in-stock"`.
- [ ] Target and alternative sizes with incompatible units (e.g. `oz` vs.
      `count`).
- [ ] An `active` record whose recorded alternative is not cheaper than the
      target.

## Matching rules (REQUIREMENTS §4/§5)

1. Matching must **prefer** an exact retailer `productId` or a matching
   `canonicalUrlPatterns` entry. Title/category matching may help a human
   diagnose a mismatch during review, but must **never** independently
   trigger a badge.
2. The matcher requires: USD currency, `in-stock` availability, and a
   positive price on the page before proceeding.
3. The selected page variant must be compatible with the catalog's
   `variant` — otherwise no match.
4. Savings = current displayed target price − catalog alternative price.
   Zero or negative → `no-match`, not a badge with $0.00 savings.
5. The matcher does **not** normalize price per unit automatically. Two
   products that differ in quantity are only ever compared after a human has
   reviewed them and recorded the difference in `knownDifferences` — the
   matcher must not infer or auto-correct for quantity differences.

## Determinism

- Matching stays deterministic and reviewed. Never introduce fuzzy string
  matching, embeddings, or an AI/LLM call as a basis for deciding whether two
  products are comparable or whether a badge should render
  (REQUIREMENTS §2, §9: "never turn remote catalog data into executable
  extension logic," and no "recommendation produced solely by AI or fuzzy
  keyword matching").
