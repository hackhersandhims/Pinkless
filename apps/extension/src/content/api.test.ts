import { describe, expect, it, vi } from 'vitest';
import { makeProductView, makeShowOutcome } from '../testing/outcome.js';
import { compareRequestBody, parseComparisonResponse, requestComparison } from './api.js';

describe('compare request', () => {
  it('sends only { current } — no locations map, no other fields', async () => {
    const current = makeProductView();
    const send = vi.fn().mockResolvedValue({ status: 'no-match' });
    await requestComparison(current, send);

    expect(send).toHaveBeenCalledWith({ type: 'pinkless:compare', payload: { current } });
    const payload = send.mock.calls[0]![0].payload as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual(['current']);
    expect(payload).not.toHaveProperty('locations');
    expect(compareRequestBody(current)).toEqual({ current });
  });

  it('carries the selected store on the product view itself', async () => {
    const send = vi.fn().mockResolvedValue({ status: 'no-match' });
    await requestComparison(makeProductView({ locationId: '01400513' }), send);
    expect(send.mock.calls[0]![0].payload.current).toMatchObject({
      priceContext: 'in-store',
      locationId: '01400513',
    });
  });

  it('rejects (so the controller stays quiet and retries later) when no answer came back', async () => {
    await expect(
      requestComparison(makeProductView(), vi.fn().mockResolvedValue(null)),
    ).rejects.toThrow();
    await expect(
      requestComparison(makeProductView(), vi.fn().mockRejectedValue(new Error('gone'))),
    ).rejects.toThrow();
  });
});

describe('parseComparisonResponse', () => {
  it('passes a show outcome through for the badge model to validate', () => {
    const outcome = makeShowOutcome();
    expect(parseComparisonResponse(outcome)).toBe(outcome);
  });

  it('accepts public fail-closed outcomes with or without development reasons', () => {
    expect(parseComparisonResponse({ status: 'no-match' })).toEqual({ status: 'no-match' });
    expect(parseComparisonResponse({ status: 'suppressed' })).toEqual({ status: 'suppressed' });
    expect(
      parseComparisonResponse({ status: 'suppressed', reason: 'page-price-mismatch' }),
    ).toEqual({ status: 'suppressed', reason: 'page-price-mismatch' });
  });

  it('rejects anything that is not one of the three outcomes', () => {
    expect(parseComparisonResponse(null)).toBeNull();
    expect(parseComparisonResponse({ status: 'ok' })).toBeNull();
    expect(parseComparisonResponse([])).toBeNull();
  });
});
