import { describe, expect, it } from 'vitest';
import { asSentence, formatCents, formatCheckedDay } from './format';

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

describe('formatCheckedDay', () => {
  it('formats in UTC so the day does not depend on the viewer time zone', () => {
    expect(formatCheckedDay('2026-09-18T23:59:00.000Z')).toBe('Sep 18');
    expect(formatCheckedDay('2026-09-19T00:00:00.000Z')).toBe('Sep 19');
  });
});

describe('asSentence', () => {
  it('adds a period only when the text does not already end a sentence', () => {
    expect(asSentence('Handle shape and color differ')).toBe('Handle shape and color differ.');
    expect(asSentence(' Handle shape and color differ. ')).toBe('Handle shape and color differ.');
  });
});
