import { createComparisonsHandler } from '../apps/api/src/routes/comparisons.js';
import { optionsResponse } from '../apps/api/src/routes/http.js';
import { runtime } from '../apps/api/src/runtime.js';

const handler = createComparisonsHandler(runtime.comparisonService);

export function GET(request: Request): Promise<Response> {
  return handler(request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, process.env);
}
