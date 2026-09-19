/**
 * Shared test helpers for the Marketplace suite: a view builder that follows
 * the ComparisonView contract, a router wrapper, and a fetch mock that serves
 * the deterministic fixture feed (src/lib/fixtures/fixture-feed.ts).
 */
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import type { ComparisonView, ProductSide, StoreLocation } from './lib/types';
import {
  CATEGORY_LABELS,
  MARKETED_TO_LABELS,
  PRICE_CONTEXT_LABELS,
  VERSION_LABELS,
} from './lib/types';
import { buildFixtureFeed, FIXTURE_STORE_ID } from './lib/fixtures/fixture-feed';

let counter = 0;

function makeSide(overrides: Partial<ProductSide> & Pick<ProductSide, 'marketedTo'>): ProductSide {
  return {
    id: `fixture-product-${overrides.marketedTo}`,
    krogerProductId: '0000000000000',
    name: 'Sample Razor',
    brand: 'Sample',
    variant: '3-blade disposable razor, 4 ct',
    size: { amount: 4, unit: 'count' },
    marketedToLabel: MARKETED_TO_LABELS[overrides.marketedTo],
    url: 'https://www.kroger.com/p/sample/0000000000000',
    priceCents: 679,
    observedAt: '2026-09-19T14:00:00.000Z',
    ...overrides,
  };
}

/**
 * One internally consistent ComparisonView: the women's product costs more,
 * both at one store, and savingsCents is exactly the difference.
 */
export function makeComparisonView(
  overrides: Partial<ComparisonView> & { otherMarketedTo?: 'men' | 'neutral' } = {},
): ComparisonView {
  counter += 1;
  const { otherMarketedTo = 'men', ...rest } = overrides;
  const category = rest.category ?? 'razors';
  const womens =
    rest.womens ??
    makeSide({
      marketedTo: 'women',
      name: 'Sample Women’s Razor',
      url: 'https://www.kroger.com/p/sample-womens/0000000000001',
      krogerProductId: '0000000000001',
      priceCents: 679,
    });
  const other =
    rest.other ??
    (makeSide({
      marketedTo: otherMarketedTo,
      name: 'Sample Men’s Razor',
      url: 'https://www.kroger.com/p/sample-mens/0000000000002',
      krogerProductId: '0000000000002',
      priceCents: 599,
    }) as ComparisonView['other']);

  return {
    id: rest.id ?? `fixture-comparison-${counter}`,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    womens,
    other,
    versionLabel: VERSION_LABELS[other.marketedTo],
    store: { locationId: FIXTURE_STORE_ID, name: 'Kroger On the Rhine' },
    priceContext: 'in-store',
    priceContextLabel: PRICE_CONTEXT_LABELS['in-store'],
    observedAt: '2026-09-19T14:00:00.000Z',
    savingsCents: womens.priceCents - other.priceCents,
    rationale: 'Both are 3-blade disposable razors in a 4-count pack.',
    matchedAttributes: ['blade count', 'pack count'],
    knownDifferences: ['Handle color differs.'],
    ...rest,
  };
}

/** Wrap a component tree in a MemoryRouter for route-aware components. */
export function withRouter(ui: ReactElement, initialEntries: string[] = ['/']): ReactElement {
  return <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>;
}

export const FIXTURE_STORES: StoreLocation[] = [
  {
    retailer: 'kroger',
    locationId: FIXTURE_STORE_ID,
    name: 'Kroger - Kroger On the Rhine',
    address: { line1: '100 E Court St', city: 'Cincinnati', state: 'OH', postalCode: '45202' },
  },
  {
    retailer: 'kroger',
    locationId: '01400473',
    name: 'Kroger - Newport',
    address: { line1: '20 W 6th St', city: 'Newport', state: 'KY', postalCode: '41071' },
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Stubs global fetch with the fixture API: `/api/comparisons` answers from
 * `buildFixtureFeed`, `/api/stores` from FIXTURE_STORES. `failComparisons`
 * makes the first N comparisons calls return 503.
 */
export function mockApi(options: { failComparisons?: number } = {}) {
  let failuresLeft = options.failComparisons ?? 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/comparisons') {
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        return jsonResponse({ status: 'suppressed' }, 503);
      }
      return jsonResponse(buildFixtureFeed(url.searchParams.get('locationId') ?? ''));
    }
    if (url.pathname === '/api/stores') {
      return jsonResponse({ status: 'ok', locations: FIXTURE_STORES });
    }
    return jsonResponse({ error: 'not-found' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
