/**
 * Shared test fixtures for the Marketplace test suite. Owned by Agent 3
 * (quality-and-deploy) so tests never depend on mock data another agent
 * ships in src/lib — everything here is built directly against the
 * ComparisonView contract in src/lib/types.ts.
 */
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { ComparisonView, OfferView } from './lib/types';
import { CATEGORY_LABELS, PRICE_CONTEXT_LABELS, RETAILER_LABELS } from './lib/types';

let counter = 0;

/** Build one OfferView. Callers override retailer/price/etc. per test. */
export function makeOfferView(overrides: Partial<OfferView> = {}): OfferView {
  const retailer = overrides.retailer ?? 'cvs';
  const priceContext = overrides.priceContext ?? 'online';
  return {
    retailer,
    retailerLabel: RETAILER_LABELS[retailer],
    url: `https://example-retailer.test/${retailer}/product`,
    priceCents: 1349,
    priceContext,
    priceContextLabel: PRICE_CONTEXT_LABELS[priceContext],
    observedAt: '2026-09-18T12:00:00.000Z',
    ...overrides,
  };
}

/**
 * Build one ComparisonView with sane, internally-consistent defaults:
 * reference and alternative share a priceContext, alternative is cheaper,
 * and savingsCents is exactly their difference (always > 0).
 */
export function makeComparisonView(overrides: Partial<ComparisonView> = {}): ComparisonView {
  counter += 1;
  const category = overrides.category ?? 'razors';

  const reference =
    overrides.reference ??
    makeOfferView({ retailer: 'cvs', priceCents: 1349, priceContext: 'online' });
  const alternative =
    overrides.alternative ??
    makeOfferView({
      retailer: 'walmart',
      priceCents: 999,
      priceContext: reference.priceContext,
    });

  const savingsCents =
    overrides.savingsCents ?? reference.priceCents - alternative.priceCents;

  return {
    id: overrides.id ?? `fixture-comparison-${counter}`,
    category,
    categoryLabel: overrides.categoryLabel ?? CATEGORY_LABELS[category],
    name: overrides.name ?? 'Sample Razor',
    brand: overrides.brand ?? 'Sample Brand',
    variant: overrides.variant ?? '5-blade cartridge razor, 4 ct',
    size: overrides.size ?? { amount: 4, unit: 'count' },
    upc: overrides.upc ?? '012345678905',
    reference,
    alternative,
    savingsCents,
    rationale:
      overrides.rationale ??
      'Same manufacturer UPC at both retailers: identical product.',
    matchedAttributes: overrides.matchedAttributes ?? ['upc', 'brand', 'pack count'],
    knownDifferences: overrides.knownDifferences ?? [],
  };
}

/** Reset the fixture id counter between tests that assert on generated ids. */
export function resetComparisonViewFixtureCounter(): void {
  counter = 0;
}

/** Wrap a component tree in a MemoryRouter for route-aware components. */
export function withRouter(ui: ReactElement, initialEntries: string[] = ['/']): ReactElement {
  return <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>;
}
