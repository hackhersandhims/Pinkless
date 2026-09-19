/**
 * The only things Pinkless stores, on this device only: the ZIP code last searched and the Kroger
 * store the person chose. Nothing here is sent anywhere except the store id, as part of a
 * comparison request.
 */
export type SelectedStore = {
  locationId: string;
  /** Display name captured when the store was chosen; never sent to the API. */
  name?: string;
};

export type ExtensionSettings = {
  postalCode?: string;
  store?: SelectedStore;
};

export const POSTAL_CODE_KEY = 'pinklessPostalCode';
export const STORE_KEY = 'pinklessKrogerStore';

const POSTAL_CODE_PATTERN = /^\d{5}(?:-\d{4})?$/;
const LOCATION_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;

type StorageArea = Pick<chrome.storage.StorageArea, 'get' | 'set' | 'remove'>;

function defaultStorage(): StorageArea {
  return chrome.storage.local;
}

export function parseSelectedStore(value: unknown): SelectedStore | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const locationId = typeof record.locationId === 'string' ? record.locationId.trim() : '';
  if (!LOCATION_ID_PATTERN.test(locationId)) return undefined;
  const name =
    typeof record.name === 'string' && record.name.trim() && record.name.length <= 200
      ? record.name.trim()
      : undefined;
  return { locationId, ...(name ? { name } : {}) };
}

export async function loadSettings(
  storage: StorageArea = defaultStorage(),
): Promise<ExtensionSettings> {
  const stored = await storage.get([POSTAL_CODE_KEY, STORE_KEY]);
  const postalCode =
    typeof stored[POSTAL_CODE_KEY] === 'string' && POSTAL_CODE_PATTERN.test(stored[POSTAL_CODE_KEY])
      ? stored[POSTAL_CODE_KEY]
      : undefined;
  const store = parseSelectedStore(stored[STORE_KEY]);
  return { ...(postalCode ? { postalCode } : {}), ...(store ? { store } : {}) };
}

export async function savePostalCode(
  postalCode: string,
  storage: StorageArea = defaultStorage(),
): Promise<void> {
  if (!POSTAL_CODE_PATTERN.test(postalCode)) throw new Error('Invalid US postal code.');
  await storage.set({ [POSTAL_CODE_KEY]: postalCode });
}

/** Saves the chosen store, or clears it when `store` is undefined. */
export async function saveSelectedStore(
  store: SelectedStore | undefined,
  storage: StorageArea = defaultStorage(),
): Promise<void> {
  const cleaned = parseSelectedStore(store);
  if (cleaned) await storage.set({ [STORE_KEY]: cleaned });
  else await storage.remove(STORE_KEY);
}
