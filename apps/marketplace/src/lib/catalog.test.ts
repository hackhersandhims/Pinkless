import { describe, expect, it } from 'vitest';
import { loadComparisons } from './api';
import { CATEGORY_ORDER } from './types';
import { getActiveComparisons, getComparison, groupByCategory } from './catalog';

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
