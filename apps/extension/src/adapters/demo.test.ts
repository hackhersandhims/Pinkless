import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import {
  DEMO_PRODUCT,
  DEMO_ROUTE,
  productPageMarkup,
  structuredData,
  type DemoScenario,
} from '../../../demo/src/page.js';
import { krogerDemoAdapter } from './demo.js';
import { adapterForUrl } from './index.js';

const DEMO_URL = `http://localhost:4174${DEMO_ROUTE}`;
const STORE = { locationId: 'kroger-1001' };

function demoDocument(scenario: DemoScenario = 'regular', url = DEMO_URL): Document {
  const window = new Window({ url });
  window.document.write(
    `<!doctype html><html><body><div id="app">${productPageMarkup(scenario)}</div></body></html>`,
  );
  window.document.close();
  return window.document as unknown as Document;
}

describe('controlled fallback demo page ↔ demo adapter contract', () => {
  it('extracts the BIC Soleil women’s product exactly as the live Kroger adapter would', () => {
    expect(krogerDemoAdapter.extract(demoDocument(), { href: DEMO_URL }, STORE)).toEqual({
      retailer: 'kroger',
      canonicalUrl:
        'https://www.kroger.com/p/bic-soleil-smooth-scented-disposable-3-blade-razors/0007033071417',
      productId: '0007033071417',
      title: 'BIC Soleil Smooth Scented Disposable 3-Blade Razors, 4 ct',
      currentPriceCents: 679,
      currency: 'USD',
      availability: 'in-stock',
      priceContext: 'in-store',
      locationId: 'kroger-1001',
    });
  });

  it('publishes the catalog identity for the reviewed product', () => {
    expect(DEMO_PRODUCT.productId).toBe('0007033071417');
    expect(DEMO_PRODUCT.regularPriceCents).toBe(679);
    expect(JSON.parse(structuredData('regular')).offers.price).toBe('6.79');
  });

  it('carries the scenario price and availability through to the product view', () => {
    expect(
      krogerDemoAdapter.extract(demoDocument('different-price'), { href: DEMO_URL }, STORE),
    ).toMatchObject({ currentPriceCents: 549, availability: 'in-stock' });
    expect(
      krogerDemoAdapter.extract(demoDocument('out-of-stock'), { href: DEMO_URL }, STORE),
    ).toMatchObject({ availability: 'out-of-stock' });
  });

  it('stays silent until a store is selected', () => {
    expect(krogerDemoAdapter.extract(demoDocument(), { href: DEMO_URL })).toBeNull();
  });

  it('registers the demo adapter only for the fixed local route', () => {
    expect(adapterForUrl(new URL(DEMO_URL))).toBe(krogerDemoAdapter);
    expect(adapterForUrl(new URL('http://localhost:4174/anything-else'))).toBeUndefined();
    expect(adapterForUrl(new URL('http://localhost:4175/product/kroger'))).toBeUndefined();
    expect(
      krogerDemoAdapter.extract(
        demoDocument('regular', 'http://localhost:4174/other'),
        { href: 'http://localhost:4174/other' },
        STORE,
      ),
    ).toBeNull();
  });

  it('fails closed if the canonical link is not a Kroger product URL', () => {
    const document = demoDocument();
    document
      .querySelector('link[rel="canonical"]')!
      .setAttribute('href', 'https://www.example.com/p/x/0007033071417');
    expect(krogerDemoAdapter.extract(document, { href: DEMO_URL }, STORE)).toBeNull();
  });
});
