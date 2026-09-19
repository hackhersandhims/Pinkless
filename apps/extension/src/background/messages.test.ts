import { describe, expect, it, vi } from 'vitest';
import { handleExtensionMessage } from './messages.js';

const KROGER_PAGE =
  'https://www.kroger.com/p/bic-soleil-smooth-scented-disposable-3-blade-razors/0007033071417';
const EXTENSION_ORIGIN = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';
const current = {
  retailer: 'kroger',
  canonicalUrl: KROGER_PAGE,
  productId: '0007033071417',
  title: 'BIC Soleil Smooth Scented Disposable 3-Blade Razors, 4 ct',
  currentPriceCents: 679,
  currency: 'USD',
  priceContext: 'in-store',
  locationId: 'kroger-1001',
  availability: 'in-stock',
};

function okFetcher() {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: 'no-match' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('extension background messaging', () => {
  it('posts exactly { current } to the fixed Pinkless API endpoint', async () => {
    const fetcher = okFetcher();
    const result = await handleExtensionMessage(
      { type: 'pinkless:compare', payload: { current } },
      KROGER_PAGE,
      fetcher,
      EXTENSION_ORIGIN,
    );
    expect(result).toEqual({ status: 'no-match' });
    expect(fetcher).toHaveBeenCalledWith(
      'https://pinkless-marketplace.vercel.app/api/compare',
      expect.objectContaining({ method: 'POST', credentials: 'omit' }),
    );
    const body = JSON.parse(fetcher.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(body).toEqual({ current });
    expect(Object.keys(body)).toEqual(['current']);
    expect(fetcher.mock.calls[0]![1].headers).toMatchObject({
      'content-type': 'application/json',
      'x-pinkless-extension-origin': EXTENSION_ORIGIN,
    });
  });

  it('drops anything else in the payload, including a legacy locations map', async () => {
    const fetcher = okFetcher();
    await handleExtensionMessage(
      {
        type: 'pinkless:compare',
        payload: { current, locations: { kroger: 'kroger-1001' }, history: ['x'] },
      },
      KROGER_PAGE,
      fetcher,
    );
    const body = JSON.parse(fetcher.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('locations');
    expect(body).not.toHaveProperty('history');
  });

  it('allows the fixed controlled fallback route', async () => {
    const fetcher = okFetcher();
    await expect(
      handleExtensionMessage(
        { type: 'pinkless:compare', payload: { current } },
        'http://localhost:4174/product/kroger',
        fetcher,
      ),
    ).resolves.toEqual({ status: 'no-match' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects other hosts, lookalikes, other local routes, and malformed messages', async () => {
    const fetcher = vi.fn();
    for (const sender of [
      'https://www.kroger.com.example.test/p/x/0007033071417',
      'http://www.kroger.com/p/x/0007033071417',
      'https://www.example.com/p/x/1',
      'http://localhost:4174/unrelated-page',
      undefined,
    ]) {
      await expect(
        handleExtensionMessage({ type: 'pinkless:compare', payload: { current } }, sender, fetcher),
      ).resolves.toBeNull();
    }
    await expect(
      handleExtensionMessage({ type: 'pinkless:compare', payload: {} }, KROGER_PAGE, fetcher),
    ).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('treats a non-2xx response or network failure as silence', async () => {
    const failing = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(
      handleExtensionMessage(
        { type: 'pinkless:compare', payload: { current } },
        KROGER_PAGE,
        failing,
      ),
    ).resolves.toBeNull();
    const throwing = vi.fn().mockRejectedValue(new TypeError('offline'));
    await expect(
      handleExtensionMessage(
        { type: 'pinkless:compare', payload: { current } },
        KROGER_PAGE,
        throwing,
      ),
    ).resolves.toBeNull();
  });
});
