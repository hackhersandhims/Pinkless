import {
  PINKLESS_MARKETPLACE_URL,
  RETAILER_LABELS,
  RETAILERS,
  type Retailer,
} from '../shared/config.js';
import {
  loadSettings,
  savePostalCode,
  saveRetailerLocation,
  type ExtensionSettings,
} from '../shared/settings.js';
import type { RetailerLocation } from '../shared/types.js';
import { lookupStores } from './stores.js';

type ProviderCard = {
  element: HTMLElement;
  status: HTMLSpanElement;
  select: HTMLSelectElement;
};

function requiredElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Missing popup element: ${selector}`);
  return element;
}

function createProviderCard(retailer: Retailer): ProviderCard {
  const card = document.createElement('article');
  card.className = 'provider-card';

  const heading = document.createElement('div');
  heading.className = 'provider-card__heading';
  const name = document.createElement('h3');
  name.className = 'body';
  name.textContent = RETAILER_LABELS[retailer];
  const status = document.createElement('span');
  status.className = 'provider-card__status caption';
  status.dataset.state = 'unchecked';
  status.textContent = 'Not checked';
  heading.append(name, status);

  const label = document.createElement('label');
  label.className = 'caption';
  label.htmlFor = `${retailer}-store`;
  label.textContent = `Selected ${RETAILER_LABELS[retailer]} store`;
  const select = document.createElement('select');
  select.id = `${retailer}-store`;
  select.className = 'body';
  select.disabled = true;
  select.append(new Option('Search by ZIP first', ''));
  select.addEventListener('change', () => {
    void saveRetailerLocation(retailer, select.value || undefined).then(() => {
      status.dataset.state = select.value ? 'saved' : 'available';
      status.textContent = select.value ? 'Saved' : 'Available';
    });
  });

  card.append(heading, label, select);
  return { element: card, status, select };
}

function locationLabel(location: RetailerLocation): string {
  return `${location.name} — ${location.address.city}, ${location.address.state}`;
}

function renderLocations(
  card: ProviderCard,
  retailer: Retailer,
  locations: RetailerLocation[] | null,
  selectedLocationId?: string,
): void {
  card.select.replaceChildren();
  if (locations === null) {
    card.status.dataset.state = 'unavailable';
    card.status.textContent = 'Unavailable';
    card.select.disabled = true;
    card.select.append(new Option('Provider unavailable', ''));
    return;
  }
  if (locations.length === 0) {
    card.status.dataset.state = 'empty';
    card.status.textContent = 'No nearby stores';
    card.select.disabled = true;
    card.select.append(new Option('No stores found', ''));
    return;
  }

  card.status.dataset.state = 'available';
  card.status.textContent = 'Available';
  card.select.disabled = false;
  card.select.append(new Option(`Choose a ${RETAILER_LABELS[retailer]} store`, ''));
  for (const location of locations) {
    card.select.append(new Option(locationLabel(location), location.locationId));
  }
  if (selectedLocationId && locations.some(({ locationId }) => locationId === selectedLocationId)) {
    card.select.value = selectedLocationId;
  }
}

async function searchStores(
  postalCode: string,
  cards: Record<Retailer, ProviderCard>,
  settings: ExtensionSettings,
): Promise<void> {
  await savePostalCode(postalCode);
  for (const card of Object.values(cards)) {
    card.status.dataset.state = 'checking';
    card.status.textContent = 'Checking…';
    card.select.disabled = true;
  }
  const results = await Promise.all(
    RETAILERS.map(
      async (retailer) => [retailer, await lookupStores(retailer, postalCode)] as const,
    ),
  );
  for (const [retailer, locations] of results) {
    renderLocations(cards[retailer], retailer, locations, settings.locations[retailer]);
  }
}

async function initialize(): Promise<void> {
  const providerList = requiredElement<HTMLDivElement>('#provider-list');
  const postalInput = requiredElement<HTMLInputElement>('#postal-code');
  const form = requiredElement<HTMLFormElement>('#store-search');
  const message = requiredElement<HTMLParagraphElement>('#search-message');
  const submit = requiredElement<HTMLButtonElement>('#store-search button[type="submit"]');
  const version = requiredElement<HTMLSpanElement>('#extension-version');
  const marketplace = requiredElement<HTMLAnchorElement>('#marketplace-link');

  version.textContent = `v${chrome.runtime.getManifest().version}`;
  marketplace.href = PINKLESS_MARKETPLACE_URL;

  const cards = Object.fromEntries(
    RETAILERS.map((retailer) => {
      const card = createProviderCard(retailer);
      providerList.append(card.element);
      return [retailer, card];
    }),
  ) as Record<Retailer, ProviderCard>;

  let settings = await loadSettings();
  if (settings.postalCode) postalInput.value = settings.postalCode;
  for (const retailer of RETAILERS) {
    const selected = settings.locations[retailer];
    if (!selected) continue;
    const card = cards[retailer];
    card.select.replaceChildren(new Option(`Saved store (${selected})`, selected));
    card.select.value = selected;
    card.select.disabled = false;
    card.status.dataset.state = 'saved';
    card.status.textContent = 'Saved';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const postalCode = postalInput.value.trim();
    if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) {
      message.textContent = 'Enter a valid five-digit US ZIP code.';
      return;
    }
    submit.disabled = true;
    message.textContent = 'Checking supported providers…';
    void searchStores(postalCode, cards, settings)
      .then(async () => {
        settings = await loadSettings();
        message.textContent = 'Choose a store for each available retailer.';
      })
      .catch(() => {
        message.textContent = 'Store lookup is unavailable. Try again when the API is running.';
      })
      .finally(() => {
        submit.disabled = false;
      });
  });
}

void initialize();
