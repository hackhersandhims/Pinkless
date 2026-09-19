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

  it('rejects messages from pages outside the three declared retailer hosts', async () => {
    const fetcher = vi.fn();
    await expect(
      handleExtensionMessage(
        { type: 'pinkless:compare', payload: {} },
        'https://www.walmart.com.example.test/ip/123456',
        fetcher,
      ),
    ).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
