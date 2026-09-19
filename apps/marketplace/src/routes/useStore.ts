import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { To } from 'react-router-dom';
import { isValidStoreId } from '../lib/api.js';
import type { SelectedStore } from '../lib/types.js';

/**
 * The chosen Kroger store lives only in the URL query (`?store=…&storeName=…`)
 * so links are shareable. Nothing is stored server-side, in cookies, or in
 * browser storage.
 */
export const STORE_PARAM = 'store';
export const STORE_NAME_PARAM = 'storeName';

const MAX_STORE_NAME = 120;

export function readStore(params: URLSearchParams): SelectedStore | undefined {
  const locationId = params.get(STORE_PARAM)?.trim() ?? '';
  if (!isValidStoreId(locationId)) return undefined;
  const name = params.get(STORE_NAME_PARAM)?.trim().slice(0, MAX_STORE_NAME);
  return { locationId, ...(name ? { name } : {}) };
}

/** Query string carrying the store plus any extra params ("?store=…&q=…"). */
export function storeSearch(
  store: SelectedStore | undefined,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams();
  if (store) {
    params.set(STORE_PARAM, store.locationId);
    if (store.name) params.set(STORE_NAME_PARAM, store.name);
  }
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const search = params.toString();
  return search ? `?${search}` : '';
}

export function useSelectedStore(): SelectedStore | undefined {
  const [params] = useSearchParams();
  return readStore(params);
}

/**
 * Builds in-app link targets that keep the chosen store, so moving between
 * pages never drops it.
 */
export function useStoreLink(): (
  pathname: string,
  options?: { hash?: string; query?: Record<string, string> },
) => To {
  const store = useSelectedStore();
  const locationId = store?.locationId;
  const name = store?.name;
  return useCallback(
    (pathname, options = {}) => ({
      pathname,
      search: storeSearch(locationId ? { locationId, ...(name ? { name } : {}) } : undefined, options.query),
      ...(options.hash ? { hash: options.hash } : {}),
    }),
    [locationId, name],
  );
}
