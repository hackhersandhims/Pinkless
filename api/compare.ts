import { createCompareHandler } from '../apps/api/src/routes/compare.js';
import { optionsResponse } from '../apps/api/src/routes/http.js';
import { runtime } from '../apps/api/src/runtime.js';

const handler = createCompareHandler(runtime.comparisonService);

export function POST(request: Request): Promise<Response> {
  return handler(request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, process.env);
}
