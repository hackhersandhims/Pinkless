import { RETAILERS, type Retailer } from './config.js';

export type RetailerLocations = Partial<Record<Retailer, string>>;

export type ExtensionSettings = {
  postalCode?: string;
  locations: RetailerLocations;
};

const POSTAL_CODE_KEY = 'pinklessPostalCode';
const LOCATIONS_KEY = 'pinklessRetailerLocations';

function cleanLocationId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() && value.length <= 128
    ? value.trim()
    : undefined;
}

function cleanLocations(value: unknown): RetailerLocations {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    RETAILERS.flatMap((retailer) => {
      const locationId = cleanLocationId(record[retailer]);
      return locationId ? [[retailer, locationId]] : [];
    }),
  );
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get([POSTAL_CODE_KEY, LOCATIONS_KEY]);
  const postalCode =
    typeof stored[POSTAL_CODE_KEY] === 'string' &&
    /^\d{5}(?:-\d{4})?$/.test(stored[POSTAL_CODE_KEY])
      ? stored[POSTAL_CODE_KEY]
      : undefined;
  return {
    ...(postalCode ? { postalCode } : {}),
    locations: cleanLocations(stored[LOCATIONS_KEY]),
  };
}

export async function savePostalCode(postalCode: string): Promise<void> {
  if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) throw new Error('Invalid US postal code.');
  await chrome.storage.local.set({ [POSTAL_CODE_KEY]: postalCode });
}

export async function saveRetailerLocation(
  retailer: Retailer,
  locationId: string | undefined,
): Promise<void> {
  const settings = await loadSettings();
  const locations = { ...settings.locations };
  const cleaned = cleanLocationId(locationId);
  if (cleaned) locations[retailer] = cleaned;
  else delete locations[retailer];
  await chrome.storage.local.set({ [LOCATIONS_KEY]: locations });
}
