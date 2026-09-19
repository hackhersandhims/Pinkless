import { describe, expect, it, vi } from 'vitest';
import { handleExtensionMessage } from './messages.js';

describe('extension background messaging', () => {
  it('forwards comparison payloads only to the fixed Pinkless API endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'no-match' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const result = await handleExtensionMessage(
      { type: 'pinkless:compare', payload: { current: {}, locations: {} } },
      'https://www.cvs.com/shop/item-prodid-123456',
      fetcher,
    );
    expect(result).toEqual({ status: 'no-match' });
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3000/api/compare',
      expect.objectContaining({ method: 'POST', credentials: 'omit' }),
    );
  });

  it('allows only the fixed controlled fallback route in addition to retailer pages', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'no-match' }), { status: 200 }));
    await expect(
      handleExtensionMessage(
        { type: 'pinkless:compare', payload: {} },
        'http://localhost:4174/product/cvs',
        fetcher,
      ),
    ).resolves.toEqual({ status: 'no-match' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects pages outside the three retailer hosts and fixed fallback route', async () => {
    const fetcher = vi.fn();
    await expect(
      handleExtensionMessage(
        { type: 'pinkless:compare', payload: {} },
        'https://www.walmart.com.example.test/ip/123456',
        fetcher,
      ),
    ).resolves.toBeNull();
    await expect(
      handleExtensionMessage(
        { type: 'pinkless:compare', payload: {} },
        'http://localhost:4174/unrelated-page',
        fetcher,
      ),
    ).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
