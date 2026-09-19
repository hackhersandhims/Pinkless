import { demoRetailerForUrl, PINKLESS_API_BASE_URL } from '../shared/config.js';

type CompareMessage = {
  type: 'pinkless:compare';
  payload: unknown;
};

function isCompareMessage(value: unknown): value is CompareMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'pinkless:compare' &&
    typeof (value as { payload?: unknown }).payload === 'object' &&
    (value as { payload?: unknown }).payload !== null
  );
}

export async function handleExtensionMessage(
  message: unknown,
  senderUrl: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  if (!isCompareMessage(message) || !senderUrl) return null;
  let sender: URL;
  try {
    sender = new URL(senderUrl);
  } catch {
    return null;
  }
  const isRetailerPage =
    sender.protocol === 'https:' &&
    ['www.amazon.com', 'www.cvs.com', 'www.kroger.com', 'www.walmart.com'].includes(
      sender.hostname,
    );
  if (!isRetailerPage && !demoRetailerForUrl(sender)) {
    return null;
  }

  try {
    const response = await fetcher(`${PINKLESS_API_BASE_URL}/api/compare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(message.payload),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}
