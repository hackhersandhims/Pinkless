import { describe, expect, it } from 'vitest';
import { formatCents } from './money';

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
