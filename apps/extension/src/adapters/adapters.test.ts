import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import type { ProductView as MatcherProductView } from '../../../../packages/matcher/src/index.js';
import { adapterForUrl } from './index.js';
import { krogerAdapter } from './kroger.js';
import type { ProductView } from './types.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Condition extends true> = Condition;
type ProductViewContractIsShared = Assert<Equal<ProductView, MatcherProductView>>;
const productViewContractIsShared: ProductViewContractIsShared = true;

const HAPPY_URL =
  'https://www.kroger.com/p/bic-soleil-smooth-scented-disposable-3-blade-razors/0007033071417';
const UNKNOWN_URL = 'https://www.kroger.com/p/unreviewed-body-wash/0003600029145';
const VARIANT_URL =
  'https://www.kroger.com/p/bic-soleil-smooth-scented-disposable-3-blade-razors-8-ct/0007033071490';
const STORE = { locationId: '01400513', name: 'Kroger Fixture Store' };

async function fixtureDocument(state: string, url: string): Promise<Document> {
  const fixtureUrl = new URL(
    `../../../../fixtures/retailers/kroger/${state}.html`,
    import.meta.url,
  );
  const html = await readFile(fixtureUrl, 'utf8');
  const window = new Window({ url });
  window.document.write(html);
  window.document.close();
  return window.document as unknown as Document;
}

describe('kroger page adapter', () => {
  it('extracts the reviewed women’s product and pins it to the selected store', async () => {
    const document = await fixtureDocument('happy', HAPPY_URL);
    expect(krogerAdapter.canHandle(new URL(HAPPY_URL))).toBe(true);
    expect(krogerAdapter.extract(document, { href: HAPPY_URL }, STORE)).toEqual({
      retailer: 'kroger',
      canonicalUrl: HAPPY_URL,
      productId: '0007033071417',
      title: 'BIC Soleil Smooth Scented Disposable 3-Blade Razors, 4 ct',
      currentPriceCents: 679,
      currency: 'USD',
      availability: 'in-stock',
      priceContext: 'in-store',
      locationId: '01400513',
    });
  });

  it('does not send the Kroger productId echoed in a GTIN field as a UPC', async () => {
    const document = await fixtureDocument('happy', HAPPY_URL);
    expect(krogerAdapter.extract(document, { href: HAPPY_URL }, STORE)).not.toHaveProperty('upc');
  });

  it('stays silent until a Kroger store is selected', async () => {
    const document = await fixtureDocument('happy', HAPPY_URL);
    expect(krogerAdapter.extract(document, { href: HAPPY_URL })).toBeNull();
    expect(krogerAdapter.extract(document, { href: HAPPY_URL }, { locationId: '' })).toBeNull();
  });

  it('extracts identity but leaves catalog membership to the matcher', async () => {
    const document = await fixtureDocument('unknown-item', UNKNOWN_URL);
    expect(krogerAdapter.extract(document, { href: UNKNOWN_URL }, STORE)).toMatchObject({
      productId: '0003600029145',
      availability: 'in-stock',
    });
  });

  it('suppresses an active coupon or membership price', async () => {
    const document = await fixtureDocument('promotion', HAPPY_URL);
    expect(krogerAdapter.extract(document, { href: HAPPY_URL }, STORE)).toBeNull();
  });

  it('preserves out-of-stock state for downstream suppression', async () => {
    const document = await fixtureDocument('out-of-stock', HAPPY_URL);
    expect(krogerAdapter.extract(document, { href: HAPPY_URL }, STORE)).toMatchObject({
      availability: 'out-of-stock',
    });
  });

  it('extracts the newly selected package by its own Kroger productId', async () => {
    const document = await fixtureDocument('variant-switch', VARIANT_URL);
    expect(krogerAdapter.extract(document, { href: VARIANT_URL }, STORE)).toMatchObject({
      productId: '0007033071490',
      currentPriceCents: 1149,
    });
  });

  it('fails closed when required page data is incomplete', async () => {
    const document = await fixtureDocument('incomplete', HAPPY_URL);
    expect(krogerAdapter.extract(document, { href: HAPPY_URL }, STORE)).toBeNull();
  });

  it('fails closed when the page shows two selected package options', async () => {
    const document = await fixtureDocument('happy', HAPPY_URL);
    const extra = document.createElement('button');
    extra.setAttribute('data-testid', 'variant-option');
    extra.setAttribute('aria-checked', 'true');
    extra.textContent = '8 ct';
    document.body.append(extra);
    expect(krogerAdapter.extract(document, { href: HAPPY_URL }, STORE)).toBeNull();
  });
});

describe('adapter registry', () => {
  it('keeps the browser ProductView aligned with the matcher contract', () => {
    expect(productViewContractIsShared).toBe(true);
  });

  it('selects the Kroger adapter for a Kroger product page', () => {
    expect(adapterForUrl(new URL(HAPPY_URL))).toBe(krogerAdapter);
  });

  it('rejects non-product, insecure, other-host, and lookalike URLs', () => {
    expect(adapterForUrl(new URL('https://www.kroger.com/search?query=razors'))).toBeUndefined();
    expect(adapterForUrl(new URL('http://www.kroger.com/p/item/0007033071417'))).toBeUndefined();
    expect(adapterForUrl(new URL('https://kroger.com.example.test/p/item/0007033071417'))).toBe(
      undefined,
    );
    expect(adapterForUrl(new URL('https://shop.kroger.com/p/item/0007033071417'))).toBeUndefined();
    expect(adapterForUrl(new URL('https://www.example.com/p/item/0007033071417'))).toBeUndefined();
  });
});
