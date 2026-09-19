import '../../../packages/tokens/tokens.css';
import './styles.css';
import {
  DEMO_ROUTE,
  SCENARIOS,
  formatCents,
  isDemoScenario,
  notFoundMarkup,
  productPageMarkup,
  structuredData,
  type DemoScenario,
} from './page';

/**
 * Switches the scenario in place, the way a retailer SPA updates a product page. The extension's
 * debounced observer must then update or remove its badge; this page never creates a badge.
 */
function updateScenario(scenario: DemoScenario): void {
  const data = document.querySelector<HTMLScriptElement>('[data-demo-structured-data]');
  const price = document.querySelector<HTMLElement>('[data-demo-price]');
  const availability = document.querySelector<HTMLElement>('[data-demo-availability]');
  const copy = document.querySelector<HTMLElement>('[data-demo-scenario-copy]');
  if (!data || !price || !availability || !copy) return;

  const details = SCENARIOS[scenario];
  data.textContent = structuredData(scenario);
  price.textContent = formatCents(details.priceCents);
  availability.textContent = details.inStock
    ? 'In stock at your store'
    : 'Out of stock at your store';
  copy.textContent = details.description;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-demo-scenario]')) {
    button.setAttribute('aria-pressed', String(button.dataset.demoScenario === scenario));
  }
}

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Demo root was not found.');

if (window.location.pathname.replace(/\/$/, '') === DEMO_ROUTE) {
  root.innerHTML = productPageMarkup('regular');
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-demo-scenario]')) {
    button.addEventListener('click', () => {
      const scenario = button.dataset.demoScenario;
      if (isDemoScenario(scenario)) updateScenario(scenario);
    });
  }
} else {
  root.innerHTML = notFoundMarkup();
}
