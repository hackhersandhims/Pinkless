import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createServer,
  loadEnv,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from 'vite';

/** Only these server-side variables are read from the repo-root `.env`. */
const SERVER_ENV_KEYS = [
  'PINKLESS_PROVIDER_MODE',
  'PINKLESS_ALLOWED_ORIGINS',
  'PINKLESS_DEBUG_REASONS',
  'KROGER_CLIENT_ID',
  'KROGER_CLIENT_SECRET',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'PINKLESS_REVIEW_API_TOKEN',
] as const;

const ROUTES = ['comparisons', 'compare', 'stores', 'review/candidates'] as const;

type RouteModule = Partial<
  Record<'GET' | 'POST' | 'OPTIONS', (request: Request) => Response | Promise<Response>>
>;

async function toRequest(req: IncomingMessage, origin: string): Promise<Request> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  const chunks: Buffer[] = [];
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    for await (const chunk of req) chunks.push(chunk as Buffer);
  }
  return new Request(new URL(req.url ?? '/', origin), {
    method: req.method ?? 'GET',
    headers,
    ...(chunks.length > 0 ? { body: Buffer.concat(chunks) } : {}),
  });
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/**
 * Local only (`vite dev` and `vite preview`): serves the repo-root `api/*.ts` Vercel functions from the
 * Vite dev server, so `pnpm dev` shows live Kroger data without Vercel CLI.
 * Kroger credentials stay in this Node process; nothing is exposed to the
 * browser bundle (no `VITE_` prefix, no `define`).
 */
type Loader = (file: string) => Promise<Record<string, unknown>>;

function loadServerEnv(mode: string, repoRoot: string): void {
  const env = loadEnv(mode, repoRoot, '');
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] !== undefined && process.env[key] === undefined) process.env[key] = env[key];
  }
}

function apiMiddleware(repoRoot: string, load: Loader, logger: { error(msg: string): void }) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    const pathname = (req.url ?? '').split('?')[0];
    const route = ROUTES.find((name) => pathname === `/api/${name}`);
    if (!route) return next();
    try {
      const module = (await load(path.join(repoRoot, 'api', `${route}.ts`))) as RouteModule;
      const handler = module[(req.method ?? 'GET') as keyof RouteModule];
      if (!handler) {
        res.statusCode = 405;
        res.end();
        return;
      }
      const origin = `http://${req.headers.host ?? 'localhost'}`;
      await send(res, await handler(await toRequest(req, origin)));
    } catch (error) {
      logger.error(`[pinkless-dev-api] ${String(error)}`);
      res.statusCode = 500;
      res.end();
    }
  };
}

export function devApi(repoRoot: string): Plugin {
  return {
    name: 'pinkless-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      loadServerEnv(server.config.mode, repoRoot);
      server.middlewares.use(
        apiMiddleware(repoRoot, (file) => server.ssrLoadModule(file), server.config.logger),
      );
    },
    // `vite preview` serves the built app locally; give it the same /api routes.
    // A separate SSR-only Vite server loads the TypeScript functions.
    async configurePreviewServer(server: PreviewServer) {
      loadServerEnv(server.config.mode, repoRoot);
      const loader = await createServer({
        root: repoRoot,
        configFile: false,
        appType: 'custom',
        logLevel: 'error',
        server: { middlewareMode: true, hmr: false },
      });
      server.httpServer.once('close', () => void loader.close());
      server.middlewares.use(
        apiMiddleware(repoRoot, (file) => loader.ssrLoadModule(file), server.config.logger),
      );
    },
  };
}
