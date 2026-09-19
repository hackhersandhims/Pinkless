// Private reviewer route. This is intentionally separate from the public comparison API.
import { createReviewCandidatesHandler } from '../../../api/src/routes/review-candidates.js';

const handler = createReviewCandidatesHandler();

export function POST(request: Request): Promise<Response> {
  return handler(request);
}
