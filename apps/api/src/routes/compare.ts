import type { ComparisonOutcome } from '../../../../packages/matcher/src/types.js';
import type { ComparisonService } from '../core/comparison-service.js';
import {
  includeReasonCodes,
  isAllowedOrigin,
  json,
  publicOutcome,
  requestOrigin,
  type RouteEnvironment,
} from './http.js';
import { parseLocations, parseProductView } from './validation.js';

export function createCompareHandler(
  service: ComparisonService,
  environment: RouteEnvironment = process.env,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const origin = requestOrigin(request);
    const includeReasons = includeReasonCodes(environment);
    if (!isAllowedOrigin(request, environment)) {
      const outcome: ComparisonOutcome = { status: 'suppressed', reason: 'origin-not-allowed' };
      return json(publicOutcome(outcome, includeReasons), 403);
    }
    if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, origin);
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 32_768) {
      const outcome: ComparisonOutcome = { status: 'suppressed', reason: 'invalid-request' };
      return json(publicOutcome(outcome, includeReasons), 413, origin);
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      const outcome: ComparisonOutcome = { status: 'suppressed', reason: 'invalid-request' };
      return json(publicOutcome(outcome, includeReasons), 400, origin);
    }
    const current =
      typeof payload === 'object' && payload !== null && 'current' in payload
        ? parseProductView((payload as { current: unknown }).current)
        : null;
    const locations =
      typeof payload === 'object' && payload !== null && 'locations' in payload
        ? parseLocations((payload as { locations: unknown }).locations)
        : {};
    if (
      !current ||
      !locations ||
      (current.priceContext !== 'online' && locations[current.retailer] !== current.locationId)
    ) {
      const outcome: ComparisonOutcome = { status: 'suppressed', reason: 'invalid-request' };
      return json(publicOutcome(outcome, includeReasons), 400, origin);
    }

    const outcome = await service.compare(current, locations);
    return json(publicOutcome(outcome, includeReasons), 200, origin);
  };
}
