import {
  isControlledDemoUrl,
  PINKLESS_API_BASE_URL,
  PINKLESS_EXTENSION_ORIGIN_HEADER,
  RETAILER_HOSTS,
  runtimeExtensionOrigin,
} from '../shared/config.js';

type CompareMessage = {
  type: 'pinkless:compare';
  payload: { current: Record<string, unknown> };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCompareMessage(value: unknown): value is CompareMessage {
  return (
    isRecord(value) &&
    value.type === 'pinkless:compare' &&
    isRecord(value.payload) &&
    isRecord(value.payload.current)
  );
}

function isAllowedSender(senderUrl: string | undefined): boolean {
  if (!senderUrl) return false;
  try {
    const sender = new URL(senderUrl);
    const isKrogerPage =
      sender.protocol === 'https:' &&
      (RETAILER_HOSTS as readonly string[]).includes(sender.hostname);
    return isKrogerPage || isControlledDemoUrl(sender);
  } catch {
    return false;
  }
}

/**
 * Forwards one comparison request from a Kroger (or fixed fallback) page to the Pinkless API.
 * The body is rebuilt as exactly `{ current }`, so nothing else a page script might add to the
 * message reaches the network. Any failure is `null` (silence).
 */
export async function handleExtensionMessage(
  message: unknown,
  senderUrl: string | undefined,
  fetcher: typeof fetch = fetch,
  extensionOrigin = runtimeExtensionOrigin(),
): Promise<unknown> {
  if (!isCompareMessage(message) || !isAllowedSender(senderUrl)) return null;

  try {
    const response = await fetcher(`${PINKLESS_API_BASE_URL}/api/compare`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(extensionOrigin ? { [PINKLESS_EXTENSION_ORIGIN_HEADER]: extensionOrigin } : {}),
      },
      body: JSON.stringify({ current: message.payload.current }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    // 200 carries every outcome, including no-match/suppressed; other statuses are failures.
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}
