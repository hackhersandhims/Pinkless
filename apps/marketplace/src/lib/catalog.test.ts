import { describe, expect, it } from 'vitest';
import { loadComparisons } from './api';
import { CATEGORY_ORDER } from './types';
import {
  alternativeRetailers,
  getActiveComparisons,
  getComparison,
  groupByCategory,
  searchComparisons,
  sortComparisons,
  summarizeFeed,
} from './catalog';
import { makeComparisonView, makeOfferView } from '../test-utils';

async function activeViews() {
  const response = await loadComparisons();
  return getActiveComparisons(response);
}

describe('getActiveComparisons', () => {
  it('includes every active comparison exactly once and excludes nothing active', async () => {
    const items = await activeViews();
    const ids = items.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe('groupByCategory', () => {
  it('places every active comparison in exactly one group', async () => {
    const items = await activeViews();
    const groups = groupByCategory(items);

    const groupedIds = groups.flatMap((g) => g.items.map((item) => item.id));
    expect(groupedIds.sort()).toEqual(items.map((c) => c.id).sort());
    expect(new Set(groupedIds).size).toBe(groupedIds.length);
  });

  it('returns groups in fixed category order, omitting empty categories', async () => {
    const items = await activeViews();
    const groups = groupByCategory(items);

    const presentSlugs = groups.map((g) => g.slug);
    const expectedOrder = CATEGORY_ORDER.filter((slug) => presentSlugs.includes(slug));
    expect(presentSlugs).toEqual(expectedOrder);

    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});

describe('getComparison', () => {
  it('returns undefined for an unknown id', async () => {
    const items = await activeViews();
    expect(getComparison(items, 'does-not-exist')).toBeUndefined();
  });

  it('returns the matching comparison for a known id', async () => {
    const items = await activeViews();
    const [first] = items;
    expect(first).toBeDefined();
    expect(getComparison(items, first!.id)?.id).toBe(first!.id);
  });
});

function fixtures() {
  const razor = makeComparisonView({
    id: 'a-razor',
    name: 'Sample Razor',
    brand: 'Sample Brand',
    category: 'razors',
    reference: makeOfferView({ retailer: 'cvs', priceCents: 1349 }),
    alternative: makeOfferView({ retailer: 'walmart', priceCents: 999 }),
  });
  const wash = makeComparisonView({
    id: 'b-wash',
    name: 'Moisturizing Body Wash',
    brand: 'Cedarline',
    variant: 'Moisturizing, 18 oz',
    category: 'body-wash',
    reference: makeOfferView({ retailer: 'walmart', priceCents: 700 }),
    alternative: makeOfferView({ retailer: 'kroger', priceCents: 650 }),
  });
  const deodorant = makeComparisonView({
    id: 'c-deodorant',
    name: 'Clear Gel Antiperspirant',
    variant: 'Clear gel, 3 oz',
    category: 'deodorant',
    reference: makeOfferView({ retailer: 'cvs', priceCents: 900 }),
    alternative: makeOfferView({ retailer: 'kroger', priceCents: 400 }),
  });
  return { razor, wash, deodorant, all: [razor, wash, deodorant] };
}

describe('sortComparisons', () => {
  it('sorts by biggest savings first and does not mutate its input', () => {
    const { razor, wash, deodorant, all } = fixtures();
    expect(sortComparisons(all, 'savings').map((i) => i.id)).toEqual([
      deodorant.id,
      razor.id,
      wash.id,
    ]);
    expect(all.map((i) => i.id)).toEqual([razor.id, wash.id, deodorant.id]);
  });

  it('sorts by lowest alternative price', () => {
    const { razor, wash, deodorant, all } = fixtures();
    expect(sortComparisons(all, 'price').map((i) => i.id)).toEqual([
      deodorant.id,
      wash.id,
      razor.id,
    ]);
  });

  it('sorts by name and breaks ties by id', () => {
    const { all } = fixtures();
    expect(sortComparisons(all, 'name').map((i) => i.name)).toEqual([
      'Clear Gel Antiperspirant',
      'Moisturizing Body Wash',
      'Sample Razor',
    ]);
    const twin = makeComparisonView({ id: 'z', name: 'Same', savingsCents: 100 });
    const twin2 = makeComparisonView({ id: 'y', name: 'Same', savingsCents: 100 });
    expect(sortComparisons([twin, twin2], 'savings').map((i) => i.id)).toEqual(['y', 'z']);
  });
});

describe('searchComparisons', () => {
  it('returns everything for a blank query', () => {
    const { all } = fixtures();
    expect(searchComparisons(all, '   ')).toEqual(all);
  });

  it('matches name, brand, category label, and retailer, case-insensitively', () => {
    const { razor, wash, all } = fixtures();
    expect(searchComparisons(all, 'RAZOR')).toEqual([razor]);
    expect(searchComparisons(all, 'cedarline')).toEqual([wash]);
    expect(searchComparisons(all, 'body wash')).toEqual([wash]);
    expect(searchComparisons(all, 'kroger').map((i) => i.id)).toEqual([wash.id, 'c-deodorant']);
  });

  it('requires every term to match', () => {
    const { all } = fixtures();
    expect(searchComparisons(all, 'razor kroger')).toEqual([]);
  });
});

describe('alternativeRetailers', () => {
  it('lists the cheaper-side retailers in fixed order, once each', () => {
    const { all } = fixtures();
    expect(alternativeRetailers(all)).toEqual(['kroger', 'walmart']);
    expect(alternativeRetailers([])).toEqual([]);
  });
});

describe('summarizeFeed', () => {
  it('derives the count, largest saving, and retailers on either side', () => {
    const { all } = fixtures();
    expect(summarizeFeed(all)).toEqual({
      count: 3,
      maxSavingsCents: 500,
      retailers: ['cvs', 'kroger', 'walmart'],
    });
  });

  it('has no largest saving for an empty feed', () => {
    expect(summarizeFeed([])).toEqual({ count: 0, maxSavingsCents: undefined, retailers: [] });
  });
});
