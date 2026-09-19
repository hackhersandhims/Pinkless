import type { ComparisonService } from '../core/comparison-service.js';
import {
  includeReasonCodes,
  isAllowedOrigin,
  json,
  requestOrigin,
  type RouteEnvironment,
} from './http.js';
import { parseStoreContext } from './validation.js';

/**
 * `GET /api/comparisons?locationId=…&priceContext=in-store` — every reviewed
 * women's vs men's/neutral pair where the men's or neutral product costs less
 * at that Kroger store. Read-only; the store ID is not stored.
 */
export function createComparisonsHandler(
  service: ComparisonService,
  environment: RouteEnvironment = process.env,
  now: () => Date = () => new Date(),
): (request: Request) => Promise<Response> {
  return async (request) => {
    const origin = requestOrigin(request);
    const includeReasons = includeReasonCodes(environment);
    if (!isAllowedOrigin(request, environment)) {
      return json(
        { status: 'suppressed', ...(includeReasons ? { reason: 'origin-not-allowed' } : {}) },
        403,
      );
    }
    if (request.method !== 'GET') return json({ error: 'method-not-allowed' }, 405, origin);
    const store = parseStoreContext(new URL(request.url));
    if (!store) {
      return json(
        { status: 'suppressed', ...(includeReasons ? { reason: 'invalid-request' } : {}) },
        400,
        origin,
      );
    }
    const result = await service.list(store);
    if (result.status !== 'ok') {
      return json(
        { status: 'suppressed', ...(includeReasons ? { reason: result.reason } : {}) },
        503,
        origin,
      );
    }
    return json(
      { status: 'ok', store, comparisons: result.comparisons, generatedAt: now().toISOString() },
      200,
      origin,
    );
  };
}
