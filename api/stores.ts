import { optionsResponse } from '../apps/api/src/routes/http.js';
import { createStoresHandler } from '../apps/api/src/routes/stores.js';
import { runtime } from '../apps/api/src/runtime.js';

const handler = createStoresHandler(runtime.gateway);

export function GET(request: Request): Promise<Response> {
  return handler(request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, process.env);
}
