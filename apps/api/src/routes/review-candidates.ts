import { json, type RouteEnvironment } from './http.js';
import { parseReviewCandidateRequest, type ReviewCandidate } from '../review/candidates.js';
import { draftGeminiCandidates } from '../review/gemini.js';

export type ReviewEnvironment = RouteEnvironment & {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  PINKLESS_REVIEW_API_TOKEN?: string;
};

export type CandidateDrafter = (
  request: NonNullable<ReturnType<typeof parseReviewCandidateRequest>>,
  environment: ReviewEnvironment,
) => Promise<ReviewCandidate[] | null>;

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
    const parsed = parseReviewCandidateRequest(payload);
    if (!parsed) return json({ error: 'invalid-request' }, 400);
    const candidates = await draft(parsed, environment);
    if (candidates === null) return json({ error: 'review-service-unavailable' }, 503);
    return json({
      candidates,
      reviewRequired: true,
      catalogWriteAllowed: false,
    }, 200);
  };
}
