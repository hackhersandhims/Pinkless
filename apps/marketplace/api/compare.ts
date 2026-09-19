// Vercel's project root is apps/marketplace, so it deploys this api/ folder, not the repo-root one.
import { createCompareHandler } from '../../api/src/routes/compare.js';
import { optionsResponse } from '../../api/src/routes/http.js';
import { runtime } from '../../api/src/runtime.js';

const handler = createCompareHandler(runtime.comparisonService);

export function POST(request: Request): Promise<Response> {
  return handler(request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, process.env);
}
