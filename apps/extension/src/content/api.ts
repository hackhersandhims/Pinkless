import type { ComparisonOutcome, ProductView } from '../shared/types.js';

/**
 * `POST /api/compare` takes exactly `{ current }`: the page's product identity with the selected
 * Kroger store (`locationId`) and store price context already on it. Nothing else leaves the page.
 */
export type CompareRequestBody = { current: ProductView };

export type CompareMessage = { type: 'pinkless:compare'; payload: CompareRequestBody };
export type StoresMessage = { type: 'pinkless:stores'; payload: { postalCode: string } };

export function compareRequestBody(current: ProductView): CompareRequestBody {
  return { current };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Accepts only the three outcome shapes. A `show` payload is passed on as-is: `toBadgeModel`
 * re-validates every field it renders and turns anything inconsistent into silence. Production
 * `no-match`/`suppressed` responses carry no reason code.
 */
export function parseComparisonResponse(value: unknown): ComparisonOutcome | null {
  if (!isRecord(value)) return null;
  if (value.status === 'show') return value as unknown as ComparisonOutcome;
  if (value.status !== 'no-match' && value.status !== 'suppressed') return null;
  return {
    status: value.status,
    ...(typeof value.reason === 'string' && value.reason.length <= 100
      ? { reason: value.reason }
      : {}),
  } as ComparisonOutcome;
}

type SendMessage = (message: CompareMessage | StoresMessage) => Promise<unknown>;

const sendToBackground: SendMessage = (message) => chrome.runtime.sendMessage(message);

/**
 * Asks the background service worker (which holds the extension origin the API allowlists) for a
 * comparison. Rejects when no valid answer came back, so the controller stays quiet and retries
 * later rather than caching a failure as "no match".
 */
export async function requestComparison(
  current: ProductView,
  send: SendMessage = sendToBackground,
): Promise<ComparisonOutcome> {
  const response = await send({ type: 'pinkless:compare', payload: compareRequestBody(current) });
  const outcome = parseComparisonResponse(response);
  if (!outcome) throw new Error('Pinkless comparison unavailable');
  return outcome;
}

/** Resolves the official Kroger locations near a saved ZIP through the extension background. */
export async function requestStores(
  postalCode: string,
  send: SendMessage = sendToBackground,
): Promise<unknown[] | null> {
  if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) return null;
  const response = await send({ type: 'pinkless:stores', payload: { postalCode } });
  return Array.isArray(response) ? response : null;
}
