import type { SelectedStore } from '../shared/settings.js';
import { parseStoreLocation } from '../shared/stores.js';
import type { StoreLocation } from '../shared/types.js';

export type KrogerPageStore = {
  name: string;
  addressLine1: string;
};

const PICKUP_BUTTON = /^(?:pickup|delivery) at ([^,]{1,200}),\s*open modal/i;

function cleanText(value: string | null | undefined, maxLength = 300): string | undefined {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned && cleaned.length <= maxLength ? cleaned : undefined;
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function storeNameKey(value: string): string {
  return normalized(value).replace(/^kroger/, '');
}

/**
 * Reads only Kroger's visible "Pickup/Delivery at …" header. Both its store name and street
 * address must be present exactly once; anything incomplete is intentionally ignored.
 */
export function readKrogerPageStore(document: Document): KrogerPageStore | null {
  const candidates = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label]')]
    .map((button) => {
      const name = button.getAttribute('aria-label')?.match(PICKUP_BUTTON)?.[1];
      const parentText = cleanText(button.parentElement?.textContent, 500);
      const buttonText = cleanText(button.textContent, 300);
      if (!name || !parentText || !buttonText) return null;
      const addressLine1 = cleanText(parentText.replace(buttonText, ''), 300);
      return addressLine1 ? { name: cleanText(name, 200), addressLine1 } : null;
    })
    .filter((store): store is { name: string | undefined; addressLine1: string } => store !== null)
    .filter((store): store is KrogerPageStore => store.name !== undefined);
  return candidates.length === 1 ? candidates[0]! : null;
}

/**
 * A ZIP lookup is only used to turn the visible Kroger store into Kroger's official location ID.
 * The name and street must both match exactly after punctuation/case normalization, and ambiguity
 * stays silent rather than guessing a nearby store.
 */
export function matchKrogerPageStore(
  pageStore: KrogerPageStore,
  locations: unknown,
): SelectedStore | undefined {
  if (!Array.isArray(locations)) return undefined;
  const matches = locations
    .map(parseStoreLocation)
    .filter((location): location is StoreLocation => location !== null)
    .filter(
      (location) =>
        storeNameKey(location.name) === storeNameKey(pageStore.name) &&
        normalized(location.address.line1) === normalized(pageStore.addressLine1),
    );
  return matches.length === 1
    ? { locationId: matches[0]!.locationId, name: matches[0]!.name }
    : undefined;
}
