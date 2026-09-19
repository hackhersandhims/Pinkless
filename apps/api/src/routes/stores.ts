import type { SuppressionReason } from '../../../../packages/matcher/src/types.js';
import type { ProviderGateway, ProviderLookupState } from '../core/gateway.js';
import {
  includeReasonCodes,
  isAllowedOrigin,
  json,
  requestOrigin,
  type RouteEnvironment,
} from './http.js';
import { parseStoreQuery } from './validation.js';

function responseForFailure(state: ProviderLookupState): {
  status: number;
  reason: SuppressionReason;
} {
  if (state === 'rate-limited') return { status: 429, reason: 'provider-rate-limited' };
  if (state === 'timeout') return { status: 504, reason: 'provider-timeout' };
  if (state === 'invalid-response') return { status: 502, reason: 'invalid-provider-response' };
  return { status: 503, reason: 'provider-unavailable' };
}

export function createStoresHandler(
  gateway: ProviderGateway,
  environment: RouteEnvironment = process.env,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const origin = requestOrigin(request);
    const includeReasons = includeReasonCodes(environment);
    if (!isAllowedOrigin(request, environment)) {
      return json(
        {
          status: 'suppressed',
          ...(includeReasons ? { reason: 'origin-not-allowed' } : {}),
        },
        403,
      );
    }
    if (request.method !== 'GET') return json({ error: 'method-not-allowed' }, 405, origin);
    const query = parseStoreQuery(new URL(request.url));
    if (!query) {
      return json(
        { status: 'suppressed', ...(includeReasons ? { reason: 'invalid-request' } : {}) },
        400,
        origin,
      );
    }

    const result = await gateway.lookupLocations(query.retailer, query.postalCode);
    if (result.state === 'ok') {
      return json({ status: 'ok', locations: result.locations }, 200, origin);
    }
    const failure = responseForFailure(result.state);
    return json(
      { status: 'suppressed', ...(includeReasons ? { reason: failure.reason } : {}) },
      failure.status,
      origin,
    );
  };
}
