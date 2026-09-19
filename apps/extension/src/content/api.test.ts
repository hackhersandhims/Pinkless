import { describe, expect, it } from 'vitest';
import type { ComparisonOutcome } from '../../../../packages/matcher/src/index.js';
import type { ShowComparison } from '../shared/types.js';
import { parseComparisonResponse } from './api.js';
import { showComparison } from './test-data.js';

type MatcherShow = Extract<ComparisonOutcome, { status: 'show' }>;
type AdapterResponseFitsMatcher = ShowComparison extends MatcherShow ? true : false;
const adapterResponseFitsMatcher: AdapterResponseFitsMatcher = true;

describe('parseComparisonResponse', () => {
  it('accepts a complete, internally consistent show outcome', () => {
    expect(adapterResponseFitsMatcher).toBe(true);
    expect(parseComparisonResponse(showComparison())).toMatchObject({
      status: 'show',
      savings: { amountCents: 400, currency: 'USD' },
    });
  });

  it('accepts public fail-closed outcomes without development reasons', () => {
    expect(parseComparisonResponse({ status: 'no-match' })).toEqual({ status: 'no-match' });
    expect(parseComparisonResponse({ status: 'suppressed' })).toEqual({ status: 'suppressed' });
  });

  it('rejects arbitrary outbound URLs and inconsistent savings', () => {
    const unsafe = showComparison({
      alternative: {
        ...showComparison().alternative,
        url: 'https://example.test/not-a-reviewed-retailer',
      },
    });
    const inconsistent = showComparison({ savings: { amountCents: 399, currency: 'USD' } });
    expect(parseComparisonResponse(unsafe)).toBeNull();
    expect(parseComparisonResponse(inconsistent)).toBeNull();
  });

  it('rejects a different-retailer alternative and a different store location', () => {
    const crossRetailer = showComparison({
      alternative: {
        ...showComparison().alternative,
        retailer: 'walmart',
        url: 'https://www.walmart.com/ip/mens-razor/walmart-mens-razor-1',
        locationId: 'walmart-1001',
      },
    });
    const differentStore = showComparison({
      alternative: { ...showComparison().alternative, locationId: 'cvs-2002' },
    });
    expect(parseComparisonResponse(crossRetailer)).toBeNull();
    expect(parseComparisonResponse(differentStore)).toBeNull();
  });

  it('rejects expired alternatives', () => {
    const expired = showComparison({
      alternative: {
        ...showComparison().alternative,
        observedAt: '2020-01-01T00:00:00.000Z',
        expiresAt: '2020-01-01T01:00:00.000Z',
      },
    });
    expect(parseComparisonResponse(expired)).toBeNull();
  });
});
