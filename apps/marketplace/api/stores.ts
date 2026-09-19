// Vercel's project root is apps/marketplace, so it deploys this api/ folder, not the repo-root one.
import { optionsResponse } from '../../api/src/routes/http.js';
import { createStoresHandler } from '../../api/src/routes/stores.js';
import { runtime } from '../../api/src/runtime.js';

const handler = createStoresHandler(runtime.gateway);

export function GET(request: Request): Promise<Response> {
  return handler(request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, process.env);
}
