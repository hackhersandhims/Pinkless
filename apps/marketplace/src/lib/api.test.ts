import { describe, expect, it } from 'vitest';
import { loadComparisons } from './api';

describe('loadComparisons (locally-built response)', () => {
  it('only ever contains comparisons with strictly positive savingsCents', async () => {
    const { comparisons } = await loadComparisons();
    expect(comparisons.length).toBeGreaterThan(0);
    for (const c of comparisons) {
      expect(c.savingsCents).toBeGreaterThan(0);
    }
  });

  it('reference and alternative always share the same priceContext', async () => {
    const { comparisons } = await loadComparisons();
    for (const c of comparisons) {
      expect(c.reference.priceContext).toBe(c.alternative.priceContext);
    }
  });

  it('savingsCents equals reference minus alternative exactly, as an integer', async () => {
    const { comparisons } = await loadComparisons();
    for (const c of comparisons) {
      expect(Number.isInteger(c.savingsCents)).toBe(true);
      expect(c.savingsCents).toBe(c.reference.price.amountCents - c.alternative.price.amountCents);
    }
  });

  it('never includes paused or retired catalog products', async () => {
    const { comparisons } = await loadComparisons();
    // paused: razor-womens-5blade-3ct, retired: deodorant-discontinued-2oz
    const ids = comparisons.map((c) => c.productId);
    expect(ids).not.toContain('razor-womens-5blade-3ct');
    expect(ids).not.toContain('deodorant-discontinued-2oz');
  });
});
