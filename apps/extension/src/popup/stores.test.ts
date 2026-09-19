import { describe, expect, it, vi } from 'vitest';
import { lookupStores } from './stores.js';

const EXTENSION_ORIGIN = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';

describe('store lookup', () => {
  it('identifies the extension while sending only the postal code in the URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          locations: [
            {
              retailer: 'kroger',
              locationId: '01100695',
              name: 'Kroger - Ponce',
              address: {
                line1: '725 Ponce de Leon Ave NE',
                city: 'Atlanta',
                state: 'GA',
                postalCode: '30306',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(lookupStores('30303', fetcher, EXTENSION_ORIGIN)).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      new URL('https://pinkless-marketplace.vercel.app/api/stores?postalCode=30303'),
      expect.objectContaining({
        headers: { 'x-pinkless-extension-origin': EXTENSION_ORIGIN },
        credentials: 'omit',
      }),
    );
  });
});
