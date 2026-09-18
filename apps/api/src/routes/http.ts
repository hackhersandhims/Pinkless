import type { ComparisonOutcome } from '../../../../packages/matcher/src/types.js';

export type RouteEnvironment = {
  NODE_ENV?: string;
  PINKLESS_ALLOWED_ORIGINS?: string;
  PINKLESS_DEBUG_REASONS?: string;
};

export function requestOrigin(request: Request): string | null {
  return request.headers.get('origin');
}

export function isAllowedOrigin(request: Request, environment: RouteEnvironment): boolean {
  const origin = requestOrigin(request);
  if (!origin) return request.headers.get('sec-fetch-site') === 'same-origin';
  if (origin === new URL(request.url).origin) return true;
  const allowed = (environment.PINKLESS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

export function includeReasonCodes(environment: RouteEnvironment): boolean {
  return environment.NODE_ENV !== 'production' || environment.PINKLESS_DEBUG_REASONS === 'true';
}

export function publicOutcome(
  outcome: ComparisonOutcome,
  includeReasons: boolean,
): Omit<ComparisonOutcome, 'reason'> | ComparisonOutcome {
  if (outcome.status === 'show' || includeReasons) return outcome;
  return { status: outcome.status };
}

export function json(body: unknown, status: number, origin: string | null = null): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    vary: 'Origin',
  });
  if (origin) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    headers.set('access-control-allow-headers', 'content-type');
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

export function optionsResponse(request: Request, environment: RouteEnvironment): Response {
  if (!isAllowedOrigin(request, environment)) return json({ status: 'suppressed' }, 403);
  return json(null, 204, requestOrigin(request));
}
