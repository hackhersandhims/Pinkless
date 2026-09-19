import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import type { ProductView as MatcherProductView } from '../../../../packages/matcher/src/index.js';
import { adapterForUrl } from './index.js';
import type { ProductView, RetailerAdapter } from './types.js';
import { amazonAdapter } from './amazon.js';
import { cvsAdapter } from './cvs.js';
import { krogerAdapter } from './kroger.js';
import { walmartAdapter } from './walmart.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Condition extends true> = Condition;
type ProductViewContractIsShared = Assert<Equal<ProductView, MatcherProductView>>;
const productViewContractIsShared: ProductViewContractIsShared = true;

type RetailerCase = {
  name: string;
  adapter: RetailerAdapter;
  happyUrl: string;
  unknownUrl: string;
  variantUrl: string;
  expected: Pick<
    ProductView,
    'retailer' | 'productId' | 'upc' | 'currentPriceCents' | 'priceContext'
  > & { locationId?: string };
  unknownProductId: string;
  variant: Pick<ProductView, 'productId' | 'upc' | 'selectedVariant' | 'currentPriceCents'>;
};

const cases: RetailerCase[] = [
  {
    name: 'amazon',
    adapter: amazonAdapter,
    happyUrl: 'https://www.amazon.com/dp/B000000001',
    unknownUrl: 'https://www.amazon.com/dp/B000000099',
    variantUrl: 'https://www.amazon.com/dp/B000000002',
    expected: {
      retailer: 'amazon',
      productId: 'B000000001',
      upc: '012345678905',
      currentPriceCents: 1299,
      priceContext: 'online',
    },
    unknownProductId: 'B000000099',
    variant: {
      productId: 'B000000002',
      upc: '036000291452',
      selectedVariant: '4 count',
      currentPriceCents: 899,
    },
  },
  {
    name: 'cvs',
    adapter: cvsAdapter,
    happyUrl: 'https://www.cvs.com/shop/venus-extra-smooth-razors-2-ct-prodid-624894',
    unknownUrl: 'https://www.cvs.com/shop/unreviewed-body-wash-prodid-999001',
    variantUrl:
      'https://www.cvs.com/shop/venus-extra-smooth-razors-4-ct-prodid-1760114?skuId=250028',
    expected: {
      retailer: 'cvs',
      productId: '624894',
      upc: '012345678905',
      currentPriceCents: 1299,
      priceContext: 'online',
    },
    unknownProductId: '999001',
    variant: {
      productId: '250028',
      upc: '042100005264',
      selectedVariant: '4 count',
      currentPriceCents: 2149,
    },
  },
  {
    name: 'kroger',
    adapter: krogerAdapter,
    happyUrl: 'https://www.kroger.com/p/venus-extra-smooth-razors/00012345678905',
    unknownUrl: 'https://www.kroger.com/p/unreviewed-body-wash/00036000291452',
    variantUrl: 'https://www.kroger.com/p/venus-extra-smooth-razors-4-count/00042100005264',
    expected: {
      retailer: 'kroger',
      productId: '00012345678905',
      upc: '00012345678905',
      currentPriceCents: 1149,
      priceContext: 'store-pickup',
      locationId: '01400943',
    },
    unknownProductId: '00036000291452',
    variant: {
      productId: '00042100005264',
      upc: '00042100005264',
      selectedVariant: '4 count',
      currentPriceCents: 1999,
    },
  },
  {
    name: 'walmart',
    adapter: walmartAdapter,
    happyUrl: 'https://www.walmart.com/ip/venus-extra-smooth-razors/123456789',
    unknownUrl: 'https://www.walmart.com/ip/unreviewed-body-wash/999000111',
    variantUrl: 'https://www.walmart.com/ip/venus-extra-smooth-razors-4-count/987654322',
    expected: {
      retailer: 'walmart',
      productId: '123456789',
      upc: '012345678905',
      currentPriceCents: 1097,
      priceContext: 'online',
    },
    unknownProductId: '999000111',
    variant: {
      productId: '987654322',
      upc: '042100005264',
      selectedVariant: '4 count',
      currentPriceCents: 1897,
    },
  },
];

async function fixtureDocument(retailer: string, state: string, url: string): Promise<Document> {
  const fixtureUrl = new URL(
    `../../../../fixtures/retailers/${retailer}/${state}.html`,
    import.meta.url,
  );
  const html = await readFile(fixtureUrl, 'utf8');
  const window = new Window({ url });
  window.document.write(html);
  window.document.close();
  return window.document as unknown as Document;
}

describe.each(cases)('$name page adapter', (retailerCase) => {
  it('extracts a complete product view from the happy fixture', async () => {
    const document = await fixtureDocument(retailerCase.name, 'happy', retailerCase.happyUrl);
    expect(retailerCase.adapter.canHandle(new URL(retailerCase.happyUrl))).toBe(true);
    expect(retailerCase.adapter.extract(document, { href: retailerCase.happyUrl })).toMatchObject(
      retailerCase.expected,
    );
  });

  it('extracts identity but leaves catalog membership to the matcher', async () => {
    const document = await fixtureDocument(
      retailerCase.name,
      'unknown-item',
      retailerCase.unknownUrl,
    );
    expect(retailerCase.adapter.extract(document, { href: retailerCase.unknownUrl })).toMatchObject(
      {
        productId: retailerCase.unknownProductId,
        availability: 'in-stock',
      },
    );
  });

  it('suppresses an active promotional or subscription price', async () => {
    const document = await fixtureDocument(retailerCase.name, 'promotion', retailerCase.happyUrl);
    expect(retailerCase.adapter.extract(document, { href: retailerCase.happyUrl })).toBeNull();
  });

  it('preserves out-of-stock state for downstream suppression', async () => {
    const document = await fixtureDocument(
      retailerCase.name,
      'out-of-stock',
      retailerCase.happyUrl,
    );
    expect(retailerCase.adapter.extract(document, { href: retailerCase.happyUrl })).toMatchObject({
      availability: 'out-of-stock',
    });
  });

  it('extracts the newly selected packaged variant', async () => {
    const document = await fixtureDocument(
      retailerCase.name,
      'variant-switch',
      retailerCase.variantUrl,
    );
    expect(retailerCase.adapter.extract(document, { href: retailerCase.variantUrl })).toMatchObject(
      retailerCase.variant,
    );
  });

  it('fails closed when required page data is incomplete or ambiguous', async () => {
    const document = await fixtureDocument(retailerCase.name, 'incomplete', retailerCase.happyUrl);
    expect(retailerCase.adapter.extract(document, { href: retailerCase.happyUrl })).toBeNull();
  });
});

describe('adapter registry', () => {
  it('keeps the browser ProductView aligned with the matcher contract', () => {
    expect(productViewContractIsShared).toBe(true);
  });

  it.each(cases)('selects only the $name adapter', (retailerCase) => {
    expect(adapterForUrl(new URL(retailerCase.happyUrl))).toBe(retailerCase.adapter);
  });

  it('rejects non-product, insecure, and lookalike URLs', () => {
    expect(adapterForUrl(new URL('https://www.cvs.com/shop/razors'))).toBeUndefined();
    expect(adapterForUrl(new URL('https://www.amazon.com/s?k=razors'))).toBeUndefined();
    expect(adapterForUrl(new URL('http://www.kroger.com/p/item/00012345678905'))).toBeUndefined();
    expect(
      adapterForUrl(new URL('https://www.walmart.com.example.test/ip/item/123456789')),
    ).toBeUndefined();
  });
});
