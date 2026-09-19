import type { Retailer } from '../../../../packages/catalog/src/schema.js';
import { KrogerProvider } from './kroger.js';
import { MockRetailerProvider } from './mock.js';
import { createMockData } from './mock-data.js';
import type { RetailerProvider } from './types.js';
import { UnavailableRetailerProvider } from './unavailable.js';

export type ProviderRegistry = Record<Retailer, RetailerProvider>;

export type ProviderEnvironment = {
  PINKLESS_PROVIDER_MODE?: string;
  KROGER_CLIENT_ID?: string;
  KROGER_CLIENT_SECRET?: string;
};

export function createProviderRegistry(
  environment: ProviderEnvironment = process.env,
): ProviderRegistry {
  if (environment.PINKLESS_PROVIDER_MODE === 'mock') {
    return { kroger: new MockRetailerProvider('kroger', createMockData()) };
  }

  const kroger =
    environment.KROGER_CLIENT_ID && environment.KROGER_CLIENT_SECRET
      ? new KrogerProvider({
          clientId: environment.KROGER_CLIENT_ID,
          clientSecret: environment.KROGER_CLIENT_SECRET,
        })
      : new UnavailableRetailerProvider('kroger', 'Kroger credentials are not configured.');

  return { kroger };
}
