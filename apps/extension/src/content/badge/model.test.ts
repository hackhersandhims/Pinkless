import { describe, expect, it } from 'vitest';
import type { ComparisonOutcome } from '../../shared/types';
import { NOW, makeShowOutcome, type ShowOutcome } from '../../testing/outcome';
import { safeOutboundUrl, toBadgeModel } from './model';

describe('toBadgeModel: the BIC pair', () => {
  it('uses the REQUIREMENTS §6 headline with savings taken from the outcome', () => {
    expect(toBadgeModel(makeShowOutcome(), NOW)?.headline).toBe(
      'Comparable alternative: save $0.80',
    );
  });

  it('names the men’s equivalent and its price', () => {
    expect(toBadgeModel(makeShowOutcome(), NOW)?.productLine).toBe(
      "Men's version: BIC Comfort 3 Advance Disposable Razors — $5.99",
    );
  });

  it('says "Neutral version" for a neutral equivalent', () => {
    const model = toBadgeModel(
      makeShowOutcome((o) => void (o.alternativeProduct.marketedTo = 'neutral')),
      NOW,
    );
    expect(model?.productLine).toBe(
      'Neutral version: BIC Comfort 3 Advance Disposable Razors — $5.99',
    );
  });

  it('adds the brand only when the name does not already start with it', () => {
    const model = toBadgeModel(
      makeShowOutcome((o) => void (o.alternativeProduct.name = 'Comfort 3 Advance Razors')),
      NOW,
    );
    expect(model?.productLine).toBe("Men's version: BIC Comfort 3 Advance Razors — $5.99");
  });

  it('supports it with the rationale, the first known difference, the store, and the date', () => {
    expect(toBadgeModel(makeShowOutcome(), NOW)?.supporting).toBe(
      'Both are BIC 3-blade disposable razors sold in a 4-count pack. ' +
        'Differs: Soleil Smooth is listed as scented; Comfort 3 Advance is not. ' +
        'Prices at your selected Kroger store, checked Sep 19.',
    );
  });

  it('links to the equivalent’s Kroger page and describes it in the link label', () => {
    const model = toBadgeModel(makeShowOutcome(), NOW);
    expect(model?.action.href).toBe(
      'https://www.kroger.com/p/bic-comfort-3-advance-disposable-razors/0007033071397',
    );
    expect(model?.action.ariaLabel).toBe(
      'See alternative: BIC Comfort 3 Advance Disposable Razors, $5.99 at your selected Kroger store (opens in a new tab)',
    );
  });

  it('lists every matched attribute and every known difference in the disclosure', () => {
    expect(toBadgeModel(makeShowOutcome(), NOW)?.details).toEqual([
      { term: 'Matched on', descriptions: ['brand, blade count, disposable, pack count'] },
      {
        term: 'Known differences',
        descriptions: [
          'Soleil Smooth is listed as scented; Comfort 3 Advance is not.',
          'Handle shape and color differ.',
        ],
      },
      {
        term: 'Prices',
        descriptions: [
          'This product: $6.79',
          "Men's version: $5.99",
          'Both are the in-store price at your selected Kroger store, checked Sep 19.',
        ],
      },
    ]);
  });

  it('describes a store-pickup comparison as store pickup, never online', () => {
    const model = toBadgeModel(
      makeShowOutcome((o) => {
        o.current.priceContext = 'store-pickup';
        o.alternative.priceContext = 'store-pickup';
        o.current.locationId = 'kroger-1001';
        o.alternative.locationId = 'kroger-1001';
      }),
      NOW,
    );
    expect(model?.details[2]?.descriptions[2]).toBe(
      'Both are the store pickup price at your selected Kroger store, checked Sep 19.',
    );
    expect(JSON.stringify(model)).not.toMatch(/online/i);
  });

  it('never explains the price gap or renders a per-unit price', () => {
    const text = JSON.stringify(toBadgeModel(makeShowOutcome(), NOW));
    expect(text).not.toMatch(/discriminat|pink tax|because|charged more|unfair/i);
    expect(text).not.toMatch(/\/\s?(oz|ml|ct|count)\b/i);
  });

  it('expires with whichever offer expires first', () => {
    const model = toBadgeModel(
      makeShowOutcome((o) => void (o.current.expiresAt = '2026-09-19T14:00:00.000Z')),
      NOW,
    );
    expect(model?.expiresAtMs).toBe(Date.parse('2026-09-19T14:00:00.000Z'));
  });
});

describe('toBadgeModel: silence (suppress-by-default)', () => {
  it.each<[string, ComparisonOutcome]>([
    ['no-match', { status: 'no-match', reason: 'no-equivalent' }],
    ['no-match without a reason (production shape)', { status: 'no-match' } as ComparisonOutcome],
    ['suppressed page-price mismatch', { status: 'suppressed', reason: 'page-price-mismatch' }],
    [
      'suppressed without a reason (production shape)',
      { status: 'suppressed' } as ComparisonOutcome,
    ],
  ])('renders nothing for %s', (_label, outcome) => {
    expect(toBadgeModel(outcome, NOW)).toBeNull();
  });

  const cases: Array<[string, (o: ShowOutcome) => void]> = [
    ['zero savings', (o) => void (o.savings.amountCents = 0)],
    ['negative savings', (o) => void (o.savings.amountCents = -80)],
    [
      'savings that do not equal current minus alternative',
      (o) => void (o.savings.amountCents = 81),
    ],
    ['non-integer savings', (o) => void (o.savings.amountCents = 0.8)],
    ['non-integer current price', (o) => void (o.current.price.amountCents = 679.5)],
    ['zero alternative price', (o) => void (o.alternative.price.amountCents = 0)],
    [
      'non-USD alternative price',
      (o) => void ((o.alternative.price as { currency: string }).currency = 'CAD'),
    ],
    ['out-of-stock alternative', (o) => void (o.alternative.availability = 'out-of-stock')],
    ['out-of-stock current product', (o) => void (o.current.availability = 'out-of-stock')],
    ['unknown-availability alternative', (o) => void (o.alternative.availability = 'unknown')],
    [
      'online prices',
      (o) => {
        o.current.priceContext = 'online';
        o.alternative.priceContext = 'online';
      },
    ],
    ['in-store vs store-pickup', (o) => void (o.alternative.priceContext = 'store-pickup')],
    ['different stores', (o) => void (o.alternative.locationId = 'kroger-2002')],
    ['missing store', (o) => void delete o.alternative.locationId],
    ['same product on both sides', (o) => void (o.alternative.productId = o.current.productId)],
    ['current product not marketed to women', (o) => void (o.product.marketedTo = 'men')],
    ['alternative marketed to women', (o) => void (o.alternativeProduct.marketedTo = 'women')],
    ['empty alternative name', (o) => void (o.alternativeProduct.name = ' ')],
    ['already-expired offer', (o) => void (o.alternative.expiresAt = '2026-09-18T17:59:59.000Z')],
    ['offer expiring exactly now', (o) => void (o.alternative.expiresAt = NOW.toISOString())],
    ['unparseable observed time', (o) => void (o.alternative.observedAt = 'yesterday')],
    ['unparseable expiry', (o) => void (o.alternative.expiresAt = 'soon')],
    ['empty rationale', (o) => void (o.rationale = '   ')],
    ['no known differences', (o) => void (o.knownDifferences = [])],
    ['no matched attributes', (o) => void (o.matchedAttributes = [])],
    [
      'non-new condition',
      (o) => void ((o.alternative as { condition: string }).condition = 'used'),
    ],
    [
      'alternative from another retailer',
      (o) => void ((o.alternative as { retailer: string }).retailer = 'other'),
    ],
    [
      'already-expired alternative',
      (o) => void (o.alternative.expiresAt = '2026-09-19T12:29:59.000Z'),
    ],
    [
      'already-expired current offer',
      (o) => void (o.current.expiresAt = '2026-09-19T12:29:59.000Z'),
    ],
    ['offer expiring exactly now', (o) => void (o.alternative.expiresAt = NOW.toISOString())],
    ['unparseable observed time', (o) => void (o.alternative.observedAt = 'yesterday')],
    ['unparseable expiry', (o) => void (o.current.expiresAt = 'soon')],
    ['http outbound URL', (o) => void (o.alternative.url = 'http://www.kroger.com/p/x/1')],
    ['javascript: outbound URL', (o) => void (o.alternative.url = 'javascript:alert(1)')],
    [
      'outbound URL on another domain',
      (o) => void (o.alternative.url = 'https://evil.example/p/1'),
    ],
    ['lookalike domain', (o) => void (o.alternative.url = 'https://kroger.com.evil.example/p/1')],
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
  it('accepts https on kroger.com and its subdomains', () => {
    expect(safeOutboundUrl('https://kroger.com/p/x/1')).toBe('https://kroger.com/p/x/1');
    expect(safeOutboundUrl('https://www.kroger.com/p/x/1')).toBe('https://www.kroger.com/p/x/1');
  });

  it('rejects credentials, non-strings, and garbage', () => {
    expect(safeOutboundUrl('https://user:pw@www.kroger.com/x')).toBeNull();
    expect(safeOutboundUrl(undefined)).toBeNull();
    expect(safeOutboundUrl('not a url')).toBeNull();
  });
});
