import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { adapterForUrl } from './index.js';
import { cvsDemoAdapter, krogerDemoAdapter, walmartDemoAdapter } from './demo.js';

const demoProduct = `
  <article
    data-pinkless-demo-product
    data-retailer="cvs"
    data-canonical-url="https://www.cvs.com/shop/sample-razor-prodid-cvs-razor-1"
    data-product-id="cvs-razor-1"
    data-upc="012345678905"
    data-title="Sample Razor"
    data-selected-variant="5-blade cartridge razor, 4 ct"
    data-current-price-cents="1299"
    data-currency="USD"
    data-price-context="store-pickup"
    data-location-id="cvs-1001"
    data-availability="in-stock"
  ></article>`;

function documentFor(url: string, markup = demoProduct): Document {
  const window = new Window({ url });
  window.document.write(`<!doctype html><html><body>${markup}</body></html>`);
  window.document.close();
  return window.document as unknown as Document;
}

describe('controlled fallback demo adapters', () => {
  it('extracts a complete, matcher-compatible product view from the CVS demo route', () => {
    const url = 'http://localhost:4174/product/cvs';
    const document = documentFor(url);
    expect(cvsDemoAdapter.extract(document, { href: url })).toMatchObject({
      retailer: 'cvs',
      canonicalUrl: 'https://www.cvs.com/shop/sample-razor-prodid-cvs-razor-1',
      productId: 'cvs-razor-1',
      upc: '012345678905',
      currentPriceCents: 1299,
      priceContext: 'store-pickup',
      locationId: 'cvs-1001',
    });
  });

  it('registers a distinct adapter for each fixed demo product route', () => {
    expect(adapterForUrl(new URL('http://localhost:4174/product/cvs'))).toBe(cvsDemoAdapter);
    expect(adapterForUrl(new URL('http://localhost:4174/product/kroger'))).toBe(krogerDemoAdapter);
    expect(adapterForUrl(new URL('http://localhost:4174/product/walmart'))).toBe(
      walmartDemoAdapter,
    );
  });

  it('fails closed if demo metadata is malformed or the route is not explicitly supported', () => {
    const malformed = demoProduct.replace(
      'data-current-price-cents="1299"',
      'data-current-price-cents="0"',
    );
    expect(
      cvsDemoAdapter.extract(documentFor('http://localhost:4174/product/cvs', malformed), {
        href: 'http://localhost:4174/product/cvs',
      }),
    ).toBeNull();
    expect(adapterForUrl(new URL('http://localhost:4174/anything-else'))).toBeUndefined();
  });
});
