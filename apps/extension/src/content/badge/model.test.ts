import { describe, expect, it } from 'vitest';
import type { ComparisonOutcome } from '../../shared/types';
import { NOW, makeShowOutcome, type ShowOutcome } from '../../testing/outcome';
import { safeOutboundUrl, toBadgeModel } from './model';

describe('toBadgeModel: the happy path', () => {
  it('uses the REQUIREMENTS §6 headline with savings taken from the outcome', () => {
    const model = toBadgeModel(makeShowOutcome(), NOW);
    expect(model?.headline).toBe("Men's alternative: save $2.40");
  });

  it('shows the reviewed rationale verbatim, the alternative price, and the check date', () => {
    const model = toBadgeModel(makeShowOutcome(), NOW);
    expect(model?.rationale).toBe(makeShowOutcome().rationale);
    expect(model?.offerLine).toBe("Men's Sample Razor · $12.59 at Kroger · Checked Sep 18, 2026");
  });

  it('links to the alternative offer and names the price and retailer in the link label', () => {
    const model = toBadgeModel(makeShowOutcome(), NOW);
    expect(model?.action.href).toBe('https://www.kroger.com/p/mens-sample-razor/123');
    expect(model?.action.ariaLabel).toBe(
      "See men's alternative: Men's Sample Razor, $12.59 at Kroger (opens in a new tab)",
    );
  });

  it('lists the facts behind the comparison, with the price context on both prices', () => {
    const model = toBadgeModel(makeShowOutcome(), NOW);
    expect(model?.details).toEqual([
      {
        term: "Women's product",
        description: 'Acme Sample Razor, 5-blade cartridge razor, 4 ct',
      },
      {
        term: "Men's alternative",
        description: "Acme Men's Sample Razor, 5-blade cartridge razor, 4 ct",
      },
      { term: 'This page', description: '$14.99 at Kroger, online price' },
      { term: 'Alternative', description: '$12.59 at Kroger, online price' },
      { term: 'Difference', description: '$2.40 less at Kroger' },
      { term: 'Matched by', description: 'Exact UPC' },
    ]);
  });

  it('never claims a store price is an online price', () => {
    const model = toBadgeModel(
      makeShowOutcome((o) => {
        o.current.priceContext = 'store-pickup';
        o.alternative.priceContext = 'store-pickup';
        o.current.locationId = 'kroger-1001';
        o.alternative.locationId = 'kroger-1001';
      }),
      NOW,
    );
    expect(model?.details[2]?.description).toBe('$14.99 at Kroger, store pickup price');
    expect(model?.details[3]?.description).toBe('$12.59 at Kroger, store pickup price');
  });

  it('omits the brand cleanly when the product has none', () => {
    const model = toBadgeModel(
      makeShowOutcome((o) => {
        delete o.product.brand;
      }),
      NOW,
    );
    expect(model?.details[0]?.description).toBe('Sample Razor, 5-blade cartridge razor, 4 ct');
  });

  it('never renders a per-unit price (unit normalization is deferred, REQUIREMENTS §5)', () => {
    const model = toBadgeModel(makeShowOutcome(), NOW);
    expect(JSON.stringify(model)).not.toMatch(/\/\s?(oz|ml|ct|count)\b/i);
  });

  it('carries the offer expiry so the controller can retire the badge on time', () => {
    expect(toBadgeModel(makeShowOutcome(), NOW)?.expiresAtMs).toBe(
      Date.parse('2026-09-19T12:00:00.000Z'),
    );
  });
});

describe('toBadgeModel: silence (suppress-by-default)', () => {
  it.each<[string, ComparisonOutcome]>([
    ['no-match', { status: 'no-match', reason: 'no-positive-savings' }],
    ['no-match without a reason (production shape)', { status: 'no-match' } as ComparisonOutcome],
    ['suppressed', { status: 'suppressed', reason: 'provider-unavailable' }],
    [
      'suppressed without a reason (production shape)',
      { status: 'suppressed' } as ComparisonOutcome,
    ],
  ])('renders nothing for %s', (_label, outcome) => {
    expect(toBadgeModel(outcome, NOW)).toBeNull();
  });

  const cases: Array<[string, (o: ShowOutcome) => void]> = [
    ['zero savings', (o) => void (o.savings.amountCents = 0)],
    ['negative savings', (o) => void (o.savings.amountCents = -240)],
    [
      'savings that do not equal current minus alternative',
      (o) => void (o.savings.amountCents = 241),
    ],
    ['non-integer savings', (o) => void (o.savings.amountCents = 2.4)],
    ['non-integer current price', (o) => void (o.current.price.amountCents = 1499.5)],
    ['zero alternative price', (o) => void (o.alternative.price.amountCents = 0)],
    [
      'non-USD alternative price',
      (o) => void ((o.alternative.price as { currency: string }).currency = 'CAD'),
    ],
    [
      'non-USD current price',
      (o) => void ((o.current.price as { currency: string }).currency = 'EUR'),
    ],
    ['out-of-stock alternative', (o) => void (o.alternative.availability = 'out-of-stock')],
    ['unknown-availability alternative', (o) => void (o.alternative.availability = 'unknown')],
    ['online vs store-pickup mismatch', (o) => void (o.alternative.priceContext = 'store-pickup')],
    [
      'store-pickup vs in-store mismatch',
      (o) => {
        o.current.priceContext = 'store-pickup';
        o.alternative.priceContext = 'in-store';
      },
    ],
    ['alternative at a different retailer', (o) => void (o.alternative.retailer = 'walmart')],
    ['already-expired offer', (o) => void (o.alternative.expiresAt = '2026-09-18T17:59:59.000Z')],
    ['offer expiring exactly now', (o) => void (o.alternative.expiresAt = NOW.toISOString())],
    ['unparseable observed time', (o) => void (o.alternative.observedAt = 'yesterday')],
    ['unparseable expiry', (o) => void (o.alternative.expiresAt = 'soon')],
    ['empty rationale', (o) => void (o.rationale = '   ')],
    ['unknown match method', (o) => void ((o as { matchedBy: string }).matchedBy = 'title')],
    [
      'non-new condition',
      (o) => void ((o.alternative as { condition: string }).condition = 'used'),
    ],
    ['http outbound URL', (o) => void (o.alternative.url = 'http://www.walmart.com/ip/x/1')],
    ['javascript: outbound URL', (o) => void (o.alternative.url = 'javascript:alert(1)')],
    [
      'outbound URL on another domain',
      (o) => void (o.alternative.url = 'https://evil.example/ip/x/1'),
    ],
    [
      'lookalike domain',
      (o) => void (o.alternative.url = 'https://walmart.com.evil.example/ip/x/1'),
    ],
    [
      'URL for a different retailer',
      (o) => void (o.alternative.url = 'https://www.cvs.com/shop/x'),
    ],
  ];
  it.each(cases)('renders nothing for %s', (_label, mutate) => {
    expect(toBadgeModel(makeShowOutcome(mutate), NOW)).toBeNull();
  });

  it('renders nothing (and does not throw) for a malformed payload', () => {
    expect(toBadgeModel({ status: 'show' } as unknown as ComparisonOutcome, NOW)).toBeNull();
    expect(toBadgeModel(null as unknown as ComparisonOutcome, NOW)).toBeNull();
  });
});

describe('safeOutboundUrl', () => {
  it('accepts https on the retailer domain and its subdomains', () => {
    expect(safeOutboundUrl('https://walmart.com/ip/1', 'walmart')).toBe('https://walmart.com/ip/1');
    expect(safeOutboundUrl('https://www.kroger.com/p/x/1', 'kroger')).toBe(
      'https://www.kroger.com/p/x/1',
    );
  });

  it('rejects credentials, non-strings, and garbage', () => {
    expect(safeOutboundUrl('https://user:pw@www.cvs.com/x', 'cvs')).toBeNull();
    expect(safeOutboundUrl(undefined, 'cvs')).toBeNull();
    expect(safeOutboundUrl('not a url', 'cvs')).toBeNull();
  });
});
