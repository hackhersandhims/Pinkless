import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import { products } from '../../../api/src/catalog.js';
import { ComparisonService } from '../../../api/src/core/comparison-service.js';
import { ProviderGateway } from '../../../api/src/core/gateway.js';
import { createProviderRegistry } from '../../../api/src/providers/registry.js';
import { createCompareHandler } from '../../../api/src/routes/compare.js';
import { parseComparisonResponse } from './api.js';
import { BADGE_ROOT_ID } from './badge.js';
import { ContentController } from './controller.js';
import { showComparison } from './test-data.js';

const CVS_URL = 'https://www.cvs.com/shop/sample-razor-prodid-cvs-razor-1';

function productPage(): Window {
  const window = new Window({ url: CVS_URL });
  window.document.write(`<!doctype html><html><head>
    <link rel="canonical" href="${CVS_URL}">
    <script type="application/ld+json">{
      "@context":"https://schema.org",
      "@type":"Product",
      "name":"Sample Razor",
      "sku":"cvs-razor-1",
      "gtin12":"012345678905",
      "size":"5-blade cartridge razor, 4 ct",
      "offers":{
        "@type":"Offer",
        "price":"12.99",
        "priceCurrency":"USD",
        "availability":"https://schema.org/InStock",
        "availableDeliveryMethod":"https://schema.org/OnSitePickup"
      }
    }</script>
    </head><body>
      <button data-testid="variant-option" aria-checked="true" data-variant="5-blade cartridge razor, 4 ct">4 count</button>
      <button data-testid="fulfillment-option" aria-checked="true" data-method="pickup" data-location-id="cvs-1001">Pickup</button>
    </body></html>`);
  window.document.close();
  return window;
}

describe('ContentController', () => {
  it('runs adapter → API → matcher → renderer with activated mock providers', async () => {
    const window = productPage();
    const service = new ComparisonService(
      products,
      new ProviderGateway(createProviderRegistry({ PINKLESS_PROVIDER_MODE: 'mock' })),
    );
    const handler = createCompareHandler(service, {
      NODE_ENV: 'development',
      PINKLESS_ALLOWED_ORIGINS: 'chrome-extension://pinkless-test',
    });
    const controller = new ContentController({
      document: window.document as unknown as Document,
      location: window.location,
      loadSettings: async () => ({
        postalCode: '45202',
        locations: {
          cvs: 'cvs-1001',
          kroger: 'kroger-1001',
          walmart: 'walmart-1001',
        },
      }),
      requestComparison: async (current, locations) => {
        const response = await handler(
          new Request('http://localhost:3000/api/compare', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              origin: 'chrome-extension://pinkless-test',
            },
            body: JSON.stringify({ current, locations }),
          }),
        );
        return parseComparisonResponse(await response.json());
      },
    });

    await controller.recompute();
    expect(window.document.getElementById(BADGE_ROOT_ID)?.shadowRoot?.textContent).toContain(
      'Comparable alternative: save $4.00',
    );
  });

  it('connects adapter output to the comparison API result and renderer', async () => {
    const window = productPage();
    const requestComparison = vi.fn().mockResolvedValue(showComparison());
    const controller = new ContentController({
      document: window.document as unknown as Document,
      location: window.location,
      loadSettings: async () => ({
        postalCode: '45202',
        locations: {
          cvs: 'cvs-1001',
          kroger: 'kroger-1001',
          walmart: 'walmart-1001',
        },
      }),
      requestComparison,
    });

    await controller.recompute();
    expect(requestComparison).toHaveBeenCalledOnce();
    expect(requestComparison.mock.calls[0]?.[0]).toMatchObject({
      retailer: 'cvs',
      productId: 'cvs-razor-1',
      currentPriceCents: 1299,
      priceContext: 'store-pickup',
    });
    expect(
      window.document
        .getElementById(BADGE_ROOT_ID)
        ?.shadowRoot?.querySelectorAll('[data-pinkless-ui]'),
    ).toHaveLength(1);

    await controller.recompute();
    expect(window.document.querySelectorAll(`#${BADGE_ROOT_ID}`)).toHaveLength(1);
  });

  it('removes a stale badge when the next extraction is incomplete', async () => {
    const window = productPage();
    const controller = new ContentController({
      document: window.document as unknown as Document,
      location: window.location,
      loadSettings: async () => ({
        locations: { cvs: 'cvs-1001', walmart: 'walmart-1001' },
      }),
      requestComparison: async () => showComparison(),
    });
    await controller.recompute();

    window.document.querySelector('script[type="application/ld+json"]')!.textContent = '{}';
    await controller.recompute();
    expect(
      window.document
        .getElementById(BADGE_ROOT_ID)
        ?.shadowRoot?.querySelector('[data-pinkless-ui]'),
    ).toBeNull();
  });

  it('stays quiet until the page store matches the explicit selection', async () => {
    const window = productPage();
    const requestComparison = vi.fn().mockResolvedValue(showComparison());
    const controller = new ContentController({
      document: window.document as unknown as Document,
      location: window.location,
      loadSettings: async () => ({ locations: { cvs: 'another-store' } }),
      requestComparison,
    });
    await controller.recompute();
    expect(requestComparison).not.toHaveBeenCalled();
    expect(window.document.getElementById(BADGE_ROOT_ID)).toBeNull();
  });
});
