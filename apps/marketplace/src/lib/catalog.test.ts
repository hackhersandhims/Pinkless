import { describe, expect, it } from 'vitest';
import {
  getActiveComparisons,
  groupByCategory,
  krogerImageUrl,
  searchComparisons,
  sortComparisons,
  storeLabel,
  summarizeFeed,
  toView,
} from './catalog';
import { comparisonHeadline } from './copy';
import {
  buildFixtureFeed,
  FIXTURE_EVEN_STORE_ID,
  FIXTURE_STORE_ID,
  FIXTURE_STORE_NAME,
} from './fixtures/fixture-feed';
import type { ShowOutcome } from './types';
import { makeComparisonView } from '../test-utils';

function fixtureOutcome(): ShowOutcome {
  const [outcome] = buildFixtureFeed().comparisons;
  if (!outcome) throw new Error('fixture feed is empty');
  return outcome;
}

describe('fixture feed (listComparisons over the reviewed catalog)', () => {
  it('lists the BIC pair at the fixture store, women’s product more expensive', () => {
    const items = getActiveComparisons(buildFixtureFeed(), FIXTURE_STORE_NAME);
    expect(items).toHaveLength(1);
    const [item] = items;
    expect(item!.womens.name).toBe('BIC Soleil Smooth Scented Disposable 3-Blade Razors');
    expect(item!.womens.marketedTo).toBe('women');
    expect(item!.other.name).toBe('BIC Comfort 3 Advance Disposable Razors');
    expect(item!.other.marketedTo).toBe('men');
    expect(item!.womens.priceCents).toBe(679);
    expect(item!.other.priceCents).toBe(599);
    expect(item!.savingsCents).toBe(80);
    expect(item!.store).toEqual({ locationId: FIXTURE_STORE_ID, name: FIXTURE_STORE_NAME });
    expect(item!.priceContextLabel).toBe('In store');
    expect(item!.womens.url).toMatch(/^https:\/\/www\.kroger\.com\/p\/.+\/0007033071417$/);
    expect(item!.other.url).toMatch(/^https:\/\/www\.kroger\.com\/p\/.+\/0007033071397$/);
    expect(item!.knownDifferences.length).toBeGreaterThan(0);
  });

  it('lists nothing where the two prices are equal', () => {
    expect(getActiveComparisons(buildFixtureFeed(FIXTURE_EVEN_STORE_ID))).toEqual([]);
  });

  it('savings is an integer equal to women’s minus other price', () => {
    for (const item of getActiveComparisons(buildFixtureFeed())) {
      expect(Number.isInteger(item.savingsCents)).toBe(true);
      expect(item.savingsCents).toBe(item.womens.priceCents - item.other.priceCents);
    }
  });
});

describe('toView fails closed', () => {
  const response = buildFixtureFeed();

  it('accepts the untampered outcome', () => {
    expect(toView(fixtureOutcome(), response)).toBeDefined();
  });

  it('drops an outcome whose savings do not add up', () => {
    const outcome = fixtureOutcome();
    expect(
      toView({ ...outcome, savings: { amountCents: 500, currency: 'USD' } }, response),
    ).toBeUndefined();
  });

  it('drops an outcome priced at a different store', () => {
    const outcome = fixtureOutcome();
    expect(
      toView(
        { ...outcome, alternative: { ...outcome.alternative, locationId: '99999999' } },
        response,
      ),
    ).toBeUndefined();
  });

  it('drops an outcome mixing price contexts', () => {
    const outcome = fixtureOutcome();
    expect(
      toView(
        { ...outcome, alternative: { ...outcome.alternative, priceContext: 'store-pickup' } },
        response,
      ),
    ).toBeUndefined();
  });

  it('drops an outcome in the wrong direction (men’s product more expensive)', () => {
    const outcome = fixtureOutcome();
    expect(
      toView(
        {
          ...outcome,
          product: outcome.alternativeProduct,
          alternativeProduct: outcome.product,
        },
        response,
      ),
    ).toBeUndefined();
  });

  it('drops an outcome with a non-Kroger link', () => {
    const outcome = fixtureOutcome();
    expect(
      toView(
        { ...outcome, current: { ...outcome.current, url: 'https://example.com/p/1' } },
        response,
      ),
    ).toBeUndefined();
  });

  it('drops an outcome with a fractional price', () => {
    const outcome = fixtureOutcome();
    expect(
      toView(
        {
          ...outcome,
          current: { ...outcome.current, price: { amountCents: 679.5, currency: 'USD' } },
          savings: { amountCents: 80.5, currency: 'USD' },
        },
        response,
      ),
    ).toBeUndefined();
  });
});

describe('copy', () => {
  it('names the men’s version in the headline', () => {
    const item = makeComparisonView({ otherMarketedTo: 'men' });
    expect(comparisonHeadline(item)).toBe('The men’s version costs $0.80 less');
  });

  it('names the neutral version when the other product is not gender-marketed', () => {
    const item = makeComparisonView({ otherMarketedTo: 'neutral' });
    expect(comparisonHeadline(item)).toBe('The neutral version costs $0.80 less');
    expect(item.other.marketedToLabel).toBe('Not gender-marketed');
  });

  it('labels a store by name, or by id when no name is known', () => {
    expect(storeLabel({ locationId: '01400513', name: 'Kroger On the Rhine' })).toBe(
      'Kroger On the Rhine',
    );
    expect(storeLabel({ locationId: '01400513' })).toBe('Kroger store 01400513');
  });
});

describe('list helpers', () => {
  const small = makeComparisonView({ id: 'b-small' });
  const large = makeComparisonView({
    id: 'a-large',
    womens: { ...small.womens, name: 'Zeta Women’s Deodorant', priceCents: 900 },
    other: { ...small.other, name: 'Alpha Men’s Deodorant', priceCents: 500 },
    savingsCents: 400,
    category: 'deodorant',
    categoryLabel: 'Deodorant',
  });

  it('sorts by largest difference first', () => {
    expect(sortComparisons([small, large], 'savings').map((item) => item.id)).toEqual([
      'a-large',
      'b-small',
    ]);
  });

  it('searches both product names and the category', () => {
    expect(searchComparisons([small, large], 'alpha').map((item) => item.id)).toEqual(['a-large']);
    expect(searchComparisons([small, large], 'zeta').map((item) => item.id)).toEqual(['a-large']);
    expect(searchComparisons([small, large], 'razors').map((item) => item.id)).toEqual(['b-small']);
    expect(searchComparisons([small, large], '')).toHaveLength(2);
  });

  it('groups in category order and summarizes the feed', () => {
    expect(groupByCategory([large, small]).map((group) => group.slug)).toEqual([
      'razors',
      'deodorant',
    ]);
    expect(summarizeFeed([small, large])).toEqual({ count: 2, maxSavingsCents: 400 });
    expect(summarizeFeed([])).toEqual({ count: 0, maxSavingsCents: undefined });
  });

  it('builds Kroger image URLs only for 13-digit product ids', () => {
    expect(krogerImageUrl('0007033071417')).toBe(
      'https://www.kroger.com/product/images/medium/front/0007033071417',
    );
    expect(krogerImageUrl('../../x')).toBeUndefined();
  });

  it('supports the large resolution and skips products with a blank Kroger photo', () => {
    expect(krogerImageUrl('0007033071417', 'large')).toBe(
      'https://www.kroger.com/product/images/large/front/0007033071417',
    );
    // Kroger serves a blank PNG for this product; the UI shows its category mark instead.
    expect(krogerImageUrl('0003700080819')).toBeUndefined();
  });
});
