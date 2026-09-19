import { json, type RouteEnvironment } from './http.js';
import { parseReviewCandidateRequest, type ReviewCandidate } from '../review/candidates.js';
import { draftGeminiCandidates } from '../review/gemini.js';
import {
  importKrogerReviewProducts,
  parseKrogerReviewImportRequest,
  type KrogerReviewImportRequest,
} from '../review/kroger-import.js';
import { createProviderRegistry, type ProviderEnvironment } from '../providers/registry.js';

export type ReviewEnvironment = RouteEnvironment &
  ProviderEnvironment & {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    PINKLESS_REVIEW_API_TOKEN?: string;
  };

export type CandidateDrafter = (
  request: NonNullable<ReturnType<typeof parseReviewCandidateRequest>>,
  environment: ReviewEnvironment,
) => Promise<ReviewCandidate[] | null>;

export type KrogerProductImporter = (
  request: KrogerReviewImportRequest,
  environment: ReviewEnvironment,
) => Promise<NonNullable<ReturnType<typeof parseReviewCandidateRequest>> | null>;

const defaultImporter: KrogerProductImporter = (request, environment) =>
  importKrogerReviewProducts(request, createProviderRegistry(environment).kroger);

function authorized(request: Request, environment: ReviewEnvironment): boolean {
  const token = environment.PINKLESS_REVIEW_API_TOKEN?.trim();
  return Boolean(token) && request.headers.get('authorization') === `Bearer ${token}`;
}

/**
 * Private, token-protected candidate drafting route. Its response is not a catalog write and is
 * deliberately unavailable to the extension and Marketplace.
 */
export function createReviewCandidatesHandler(
  environment: ReviewEnvironment = process.env,
  draft: CandidateDrafter = draftGeminiCandidates,
  importProducts: KrogerProductImporter = defaultImporter,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);
    if (!authorized(request, environment)) return json({ error: 'unauthorized' }, 401);
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 65_536) {
      return json({ error: 'invalid-request' }, 413);
    }
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'invalid-request' }, 400);
    }
    const direct = parseReviewCandidateRequest(payload);
    const importRequest = parseKrogerReviewImportRequest(payload);
    if ((direct && importRequest) || (!direct && !importRequest)) {
      return json({ error: 'invalid-request' }, 400);
    }
    const parsed = direct ?? (await importProducts(importRequest!, environment));
    if (!parsed) return json({ error: 'kroger-import-unavailable' }, 503);
    const candidates = await draft(parsed, environment);
    if (candidates === null) return json({ error: 'review-service-unavailable' }, 503);
    return json(
      {
        source: direct ? 'reviewer-supplied' : 'kroger-official-api',
        products: parsed.products,
        candidates,
        reviewRequired: true,
        catalogWriteAllowed: false,
      },
      200,
    );
  };
}
