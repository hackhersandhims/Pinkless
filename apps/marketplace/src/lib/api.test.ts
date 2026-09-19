import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadComparisons, loadStores } from './api';
import { buildFixtureFeed, FIXTURE_STORE_ID } from './fixtures/fixture-feed';

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadComparisons', () => {
  it('calls the same-origin list endpoint for the store, in-store prices', async () => {
    const fetchMock = stubFetch(buildFixtureFeed());

    const response = await loadComparisons(FIXTURE_STORE_ID);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toBe(`/api/comparisons?locationId=${FIXTURE_STORE_ID}&priceContext=in-store`);
    expect(response.comparisons).toHaveLength(1);
  });

  it('throws on a non-2xx response instead of returning fallback data', async () => {
    stubFetch({ status: 'suppressed' }, 503);
    await expect(loadComparisons(FIXTURE_STORE_ID)).rejects.toThrow(/503/);
  });

  it('throws on a 200 body that is not an ok feed', async () => {
    stubFetch({ status: 'suppressed' });
    await expect(loadComparisons(FIXTURE_STORE_ID)).rejects.toThrow();
  });

  it('rejects a malformed store id without calling the API', async () => {
    const fetchMock = stubFetch(buildFixtureFeed());
    await expect(loadComparisons('../etc')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('loadStores', () => {
  it('returns well-formed Kroger locations and drops malformed ones', async () => {
    const good = {
      retailer: 'kroger',
      locationId: '01400513',
      name: 'Kroger - Kroger On the Rhine',
      address: { line1: '100 E Court St', city: 'Cincinnati', state: 'OH', postalCode: '45202' },
    };
    const fetchMock = stubFetch({ status: 'ok', locations: [good, { retailer: 'kroger' }] });

    const stores = await loadStores('45202');

    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe('/api/stores?postalCode=45202');
    expect(stores).toEqual([good]);
  });

  it('rejects anything but a five-digit ZIP without calling the API', async () => {
    const fetchMock = stubFetch({ status: 'ok', locations: [] });
    await expect(loadStores('4520')).rejects.toThrow();
    await expect(loadStores('abcde')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the API fails', async () => {
    stubFetch({ status: 'suppressed' }, 429);
    await expect(loadStores('45202')).rejects.toThrow(/429/);
  });
});
