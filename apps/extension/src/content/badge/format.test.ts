import { describe, expect, it } from 'vitest';
import { formatCents, formatChecked } from './format';

describe('formatCents', () => {
  it.each([
    [0, '$0.00'],
    [5, '$0.05'],
    [240, '$2.40'],
    [1349, '$13.49'],
    [100000, '$1,000.00'],
    [123456, '$1,234.56'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it('matches the Marketplace formatter for every value in a sweep', () => {
    const marketplace = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    for (let cents = 0; cents < 250_000; cents += 137) {
      expect(formatCents(cents)).toBe(marketplace.format(cents / 100));
    }
  });

  it.each([1.5, -1, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])(
    'rejects %s instead of rounding it',
    (value) => {
      expect(() => formatCents(value)).toThrow(RangeError);
    },
  );
});

describe('formatChecked', () => {
  it('formats in UTC so the day does not depend on the viewer time zone', () => {
    expect(formatChecked('2026-09-18T23:59:00.000Z')).toBe('Checked Sep 18, 2026');
    expect(formatChecked('2026-09-19T00:00:00.000Z')).toBe('Checked Sep 19, 2026');
  });
});
