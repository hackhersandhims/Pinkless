/**
 * Markup for the controlled fallback product page. It is a stand-in for one kroger.com product
 * page, publishing the same signals the extension's Kroger adapter reads on the live site: a
 * canonical kroger.com product link and one schema.org Product/Offer. The extension's demo adapter
 * runs the same extraction code on it (see apps/extension/src/adapters/demo.test.ts).
 *
 * All values are fixed. The page never fetches prices; the Pinkless API prices both products at
 * the store selected in the extension popup, and the page price is only a consistency check.
 */

export const DEMO_ROUTE = '/product/kroger';

export const DEMO_PRODUCT = {
  productId: '0007033071417',
  canonicalUrl:
    'https://www.kroger.com/p/bic-soleil-smooth-scented-disposable-3-blade-razors/0007033071417',
  brand: 'BIC',
  title: 'BIC Soleil Smooth Scented Disposable 3-Blade Razors',
  size: '4 ct',
  regularPriceCents: 679,
} as const;

export type DemoScenario = 'regular' | 'different-price' | 'out-of-stock';

type ScenarioDetails = {
  label: string;
  description: string;
  priceCents: number;
  inStock: boolean;
};

export const SCENARIOS: Record<DemoScenario, ScenarioDetails> = {
  regular: {
    label: 'Regular price',
    description:
      'The page shows Kroger’s regular price. With a store selected, Pinkless can show the reviewed men’s equivalent if it costs less at that store.',
    priceCents: DEMO_PRODUCT.regularPriceCents,
    inStock: true,
  },
  'different-price': {
    label: 'Different page price',
    description:
      'The page price no longer matches the store price Kroger’s API reports, so Pinkless must remove the badge.',
    priceCents: 549,
    inStock: true,
  },
  'out-of-stock': {
    label: 'Out of stock',
    description: 'The product is unavailable, so Pinkless must stay quiet.',
    priceCents: DEMO_PRODUCT.regularPriceCents,
    inStock: false,
  },
};

export const DEMO_SCENARIOS = Object.keys(SCENARIOS) as DemoScenario[];

export function isDemoScenario(value: unknown): value is DemoScenario {
  return typeof value === 'string' && value in SCENARIOS;
}

/** Integer cents to "$6.79" without a floating-point intermediate. */
export function formatCents(amountCents: number): string {
  const cents = amountCents % 100;
  const dollars = (amountCents - cents) / 100;
  return `$${dollars}.${String(cents).padStart(2, '0')}`;
}

/** "679" -> "6.79", the decimal string schema.org expects, built from integers. */
function schemaPrice(amountCents: number): string {
  return formatCents(amountCents).slice(1);
}

export function structuredData(scenario: DemoScenario): string {
  const details = SCENARIOS[scenario];
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${DEMO_PRODUCT.title}, ${DEMO_PRODUCT.size}`,
    sku: DEMO_PRODUCT.productId,
    brand: { '@type': 'Brand', name: DEMO_PRODUCT.brand },
    size: DEMO_PRODUCT.size,
    offers: {
      '@type': 'Offer',
      price: schemaPrice(details.priceCents),
      priceCurrency: 'USD',
      availability: details.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  });
}

function availabilityText(scenario: DemoScenario): string {
  return SCENARIOS[scenario].inStock ? 'In stock at your store' : 'Out of stock at your store';
}

export function productPageMarkup(scenario: DemoScenario = 'regular'): string {
  const details = SCENARIOS[scenario];
  const scenarioButtons = DEMO_SCENARIOS.map(
    (key) =>
      `<button class="scenario-button label" type="button" data-demo-scenario="${key}" aria-pressed="${key === scenario}">${SCENARIOS[key].label}</button>`,
  ).join('');

  return `<div class="demo-banner caption" role="note">
      Pinkless fallback demo: a stand-in for a kroger.com product page, used when the live page is unavailable. Not operated by Kroger.
    </div>
    <link rel="canonical" href="${DEMO_PRODUCT.canonicalUrl}" />
    <script type="application/ld+json" data-demo-structured-data>${structuredData(scenario)}</script>
    <main class="product-page">
      <nav class="breadcrumbs caption" aria-label="Breadcrumb">
        <span>Health &amp; Beauty</span> › <span>Shaving &amp; Hair Removal</span> › <span>Razors</span>
      </nav>

      <div class="product-layout">
        <div class="product-image" role="img" aria-label="Product image placeholder">
          <span class="label">BIC</span>
        </div>

        <section class="product-summary" aria-labelledby="product-title">
          <p class="label">${DEMO_PRODUCT.brand}</p>
          <h1 id="product-title" class="heading">${DEMO_PRODUCT.title}</h1>
          <p class="caption">Kroger product ${DEMO_PRODUCT.productId}</p>

          <p class="product-price display" data-demo-price>${formatCents(details.priceCents)}</p>
          <p class="body" data-demo-availability>${availabilityText(scenario)}</p>

          <div class="size-options" role="group" aria-label="Size">
            <span class="label">Size</span>
            <button class="size-option label" type="button" data-testid="variant-option" aria-checked="true" data-variant="${DEMO_PRODUCT.size}">${DEMO_PRODUCT.size}</button>
          </div>

          <button class="add-to-cart label" type="button" disabled>Add to cart (disabled in demo)</button>
        </section>
      </div>

      <section class="scenario-panel" aria-labelledby="scenario-title">
        <h2 id="scenario-title" class="label">Demo scenario</h2>
        <div class="scenario-control" role="group" aria-label="Demo scenario">${scenarioButtons}</div>
        <p class="caption" data-demo-scenario-copy>${details.description}</p>
      </section>
    </main>`;
}

export function notFoundMarkup(): string {
  return `<main class="product-page">
      <h1 class="heading">Pinkless fallback demo</h1>
      <p class="body">The demo product page is at <a href="${DEMO_ROUTE}">${DEMO_ROUTE}</a>.</p>
    </main>`;
}
