import '../../../packages/tokens/tokens.css';
import './styles.css';

type Retailer = 'cvs' | 'kroger' | 'walmart';
type PriceScenario = 'standard' | 'lower-current-price';

type DemoProduct = {
  retailer: Retailer;
  label: string;
  canonicalUrl: string;
  productId: string;
  locationId: string;
};

const PRODUCT = {
  upc: '012345678905',
  title: 'Sample Razor',
  selectedVariant: '5-blade cartridge razor, 4 ct',
  priceContext: 'store-pickup',
  availability: 'in-stock',
  currency: 'USD',
} as const;

const RETAILERS: Record<Retailer, DemoProduct> = {
  cvs: {
    retailer: 'cvs',
    label: 'CVS',
    canonicalUrl: 'https://www.cvs.com/shop/sample-razor-prodid-cvs-razor-1',
    productId: 'cvs-razor-1',
    locationId: 'cvs-1001',
  },
  kroger: {
    retailer: 'kroger',
    label: 'Kroger',
    canonicalUrl: 'https://www.kroger.com/p/sample-razor/00012345678905',
    productId: '00012345678905',
    locationId: 'kroger-1001',
  },
  walmart: {
    retailer: 'walmart',
    label: 'Walmart',
    canonicalUrl: 'https://www.walmart.com/ip/sample-razor/walmart-razor-1',
    productId: 'walmart-razor-1',
    locationId: 'walmart-1001',
  },
};

const MOCK_OFFERS = [
  { retailer: 'CVS', amountCents: 1099, location: 'CVS Downtown' },
  { retailer: 'Kroger', amountCents: 999, location: 'Kroger Downtown' },
  { retailer: 'Walmart', amountCents: 899, location: 'Walmart Downtown' },
] as const;

function demoRetailer(pathname: string): Retailer {
  const candidate = pathname.match(/^\/product\/(cvs|kroger|walmart)\/?$/)?.[1];
  return candidate === 'cvs' || candidate === 'kroger' || candidate === 'walmart'
    ? candidate
    : 'cvs';
}

function formatMoney(amountCents: number): string {
  const dollars = Math.floor(amountCents / 100);
  const cents = String(amountCents % 100).padStart(2, '0');
  return `$${dollars}.${cents}`;
}

function currentPrice(scenario: PriceScenario): number {
  return scenario === 'standard' ? 1299 : 849;
}

function routeFor(retailer: Retailer): string {
  return `/product/${retailer}`;
}

function pageMarkup(product: DemoProduct): string {
  const offerMarkup = MOCK_OFFERS.map(
    (offer) => `<li class="offer-card">
      <span class="label">${offer.retailer}</span>
      <strong class="heading">${formatMoney(offer.amountCents)}</strong>
      <span class="caption">Mock store-pickup offer · ${offer.location}</span>
    </li>`,
  ).join('');
  const retailerLinks = (Object.keys(RETAILERS) as Retailer[])
    .map((retailer) => {
      const candidate = RETAILERS[retailer];
      return `<a class="retailer-link label" href="${routeFor(retailer)}">${candidate.label} page</a>`;
    })
    .join('');

  return `<main class="demo-shell">
    <header class="demo-header">
      <p class="label">Pinkless controlled fallback</p>
      <h1 class="display">Reliable demo product page</h1>
      <p class="body">This team-owned page is used only when a live retailer page is unavailable. It sends the same reviewed product identity through the extension, API, and matcher.</p>
      <nav class="retailer-links" aria-label="Demo retailer pages">${retailerLinks}</nav>
    </header>

    <article
      class="product-card"
      data-pinkless-demo-product
      data-retailer="${product.retailer}"
      data-canonical-url="${product.canonicalUrl}"
      data-product-id="${product.productId}"
      data-upc="${PRODUCT.upc}"
      data-title="${PRODUCT.title}"
      data-selected-variant="${PRODUCT.selectedVariant}"
      data-current-price-cents="${currentPrice('standard')}"
      data-currency="${PRODUCT.currency}"
      data-price-context="${PRODUCT.priceContext}"
      data-location-id="${product.locationId}"
      data-availability="${PRODUCT.availability}"
    >
      <p class="label">${product.label} · store pickup</p>
      <h2 class="heading">${PRODUCT.title}</h2>
      <p class="body">${PRODUCT.selectedVariant}</p>
      <p class="caption">UPC ${PRODUCT.upc} · available at the selected demo store</p>
      <p class="product-price display" data-demo-current-price>${formatMoney(currentPrice('standard'))}</p>
      <div class="scenario-control" role="group" aria-label="Demo price variant">
        <span class="label">Price variant</span>
        <button class="scenario-button label" type="button" data-demo-scenario="standard" aria-pressed="true">Standard price</button>
        <button class="scenario-button label" type="button" data-demo-scenario="lower-current-price" aria-pressed="false">Lower current price</button>
      </div>
      <p class="caption" data-demo-scenario-copy>Standard price leaves a verified lower alternative for the extension to show.</p>
    </article>

    <section class="offers-section" aria-labelledby="mock-offers-title">
      <p class="label">Mock provider data</p>
      <h2 id="mock-offers-title" class="heading">CVS, Kroger, and Walmart offers</h2>
      <ul class="offer-list">${offerMarkup}</ul>
      <p class="caption">These deterministic offers mirror local mock-provider mode. They are not live retailer prices.</p>
    </section>
  </main>`;
}

function updateScenario(scenario: PriceScenario): void {
  const product = document.querySelector<HTMLElement>('[data-pinkless-demo-product]');
  const price = document.querySelector<HTMLElement>('[data-demo-current-price]');
  const copy = document.querySelector<HTMLElement>('[data-demo-scenario-copy]');
  if (!product || !price || !copy) return;

  const amountCents = currentPrice(scenario);
  product.dataset.currentPriceCents = String(amountCents);
  price.textContent = formatMoney(amountCents);
  copy.textContent =
    scenario === 'standard'
      ? 'Standard price leaves a verified lower alternative for the extension to show.'
      : 'Lower current price removes the savings badge after the extension recomputes.';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-demo-scenario]')) {
    button.setAttribute('aria-pressed', String(button.dataset.demoScenario === scenario));
  }
}

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Demo root was not found.');

root.innerHTML = pageMarkup(RETAILERS[demoRetailer(window.location.pathname)]);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-demo-scenario]')) {
  button.addEventListener('click', () => {
    const scenario = button.dataset.demoScenario;
    if (scenario === 'standard' || scenario === 'lower-current-price') updateScenario(scenario);
  });
}
