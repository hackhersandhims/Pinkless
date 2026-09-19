import { describe, expect, it } from 'vitest';
import { formatCents, percentLower } from './money';

describe('formatCents', () => {
  it('formats whole and fractional dollar amounts', () => {
    expect(formatCents(1349)).toBe('$13.49');
  });

  it('formats sub-dollar amounts with leading zero', () => {
    expect(formatCents(5)).toBe('$0.05');
  });

  it('throws on non-integer input', () => {
    expect(() => formatCents(13.5)).toThrow();
  });
});

describe('percentLower', () => {
  it('rounds the saving to a whole percent of the reference price', () => {
    expect(percentLower(350, 1349)).toBe(26);
    expect(percentLower(100, 1099)).toBe(9);
  });

  it('returns undefined when there is nothing honest to show', () => {
    expect(percentLower(0, 1000)).toBeUndefined();
    expect(percentLower(-5, 1000)).toBeUndefined();
    expect(percentLower(5, 0)).toBeUndefined();
    expect(percentLower(1, 1000)).toBeUndefined();
  });

  it('throws on non-integer input', () => {
    expect(() => percentLower(3.5, 100)).toThrow();
  });
});
