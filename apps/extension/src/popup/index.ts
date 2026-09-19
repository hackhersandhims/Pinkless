import { PINKLESS_MARKETPLACE_URL } from '../shared/config.js';
import {
  loadSettings,
  savePostalCode,
  saveSelectedStore,
  type SelectedStore,
} from '../shared/settings.js';
import type { StoreLocation } from '../shared/types.js';
import { lookupStores } from './stores.js';

function requiredElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Missing popup element: ${selector}`);
  return element;
}

function storeLabel(location: StoreLocation): string {
  return `${location.name} — ${location.address.line1}, ${location.address.city}, ${location.address.state}`;
}

function describeSelection(store: SelectedStore | undefined): string {
  if (!store) {
    return 'No store selected. Pinkless stays quiet on Kroger pages until you choose one.';
  }
  return `Comparing prices at ${store.name ?? `Kroger store ${store.locationId}`}.`;
}

async function initialize(): Promise<void> {
  const postalInput = requiredElement<HTMLInputElement>('#postal-code');
  const form = requiredElement<HTMLFormElement>('#store-search');
  const message = requiredElement<HTMLParagraphElement>('#search-message');
  const submit = requiredElement<HTMLButtonElement>('#store-search button[type="submit"]');
  const select = requiredElement<HTMLSelectElement>('#kroger-store');
  const selection = requiredElement<HTMLParagraphElement>('#store-selection');
  const version = requiredElement<HTMLSpanElement>('#extension-version');
  const marketplace = requiredElement<HTMLAnchorElement>('#marketplace-link');

  version.textContent = `v${chrome.runtime.getManifest().version}`;
  marketplace.href = PINKLESS_MARKETPLACE_URL;

  let settings = await loadSettings();
  let locations: StoreLocation[] = [];
  if (settings.postalCode) postalInput.value = settings.postalCode;
  selection.textContent = describeSelection(settings.store);

  select.replaceChildren();
  if (settings.store) {
    select.append(
      new Option(
        settings.store.name ?? `Saved store (${settings.store.locationId})`,
        settings.store.locationId,
      ),
      new Option('Clear store', ''),
    );
    select.value = settings.store.locationId;
    select.disabled = false;
  } else {
    select.append(new Option('Search by ZIP first', ''));
    select.disabled = true;
  }

  select.addEventListener('change', () => {
    const chosen = locations.find(({ locationId }) => locationId === select.value);
    const store: SelectedStore | undefined = chosen
      ? { locationId: chosen.locationId, name: chosen.name }
      : select.value && settings.store?.locationId === select.value
        ? settings.store
        : undefined;
    void saveSelectedStore(store).then(async () => {
      settings = await loadSettings();
      selection.textContent = describeSelection(settings.store);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const postalCode = postalInput.value.trim();
    if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) {
      message.textContent = 'Enter a valid five-digit US ZIP code.';
      return;
    }
    submit.disabled = true;
    message.textContent = 'Finding Kroger stores…';
    void savePostalCode(postalCode)
      .then(() => lookupStores(postalCode))
      .then((found) => {
        select.replaceChildren();
        if (found === null) {
          locations = [];
          select.append(new Option('Store lookup unavailable', ''));
          select.disabled = true;
          message.textContent = 'Store lookup is unavailable. Try again when the API is running.';
          return;
        }
        locations = found;
        if (found.length === 0) {
          select.append(new Option('No Kroger stores found', ''));
          select.disabled = true;
          message.textContent = `No Kroger stores found near ${postalCode}.`;
          return;
        }
        select.append(new Option('Choose a Kroger store', ''));
        for (const location of found) {
          select.append(new Option(storeLabel(location), location.locationId));
        }
        select.disabled = false;
        const saved = settings.store?.locationId;
        if (saved && found.some(({ locationId }) => locationId === saved)) select.value = saved;
        message.textContent = `Found ${found.length} Kroger ${found.length === 1 ? 'store' : 'stores'}. Choose one.`;
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
