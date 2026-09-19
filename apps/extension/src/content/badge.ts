import { RETAILER_LABELS } from '../shared/config.js';
import type { ShowComparison } from '../shared/types.js';
import { TOKENS_CSS } from './tokens.js';

export const BADGE_ROOT_ID = 'pinkless-badge-root';

const BADGE_CSS = `
:host {
  all: initial;
}

.pinkless-badge {
  position: fixed;
  z-index: 2147483647;
  display: grid;
  gap: var(--space-3);
  max-inline-size: calc(100vw - var(--space-6) - var(--space-6));
  padding: var(--space-4);
  border: thin solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-100);
  color: var(--ink);
  font-family: var(--font-sans);
}

.pinkless-badge[data-position="bottom-right"] {
  inset-inline-end: var(--space-4);
  inset-block-end: var(--space-4);
}

.pinkless-badge[data-position="bottom-left"] {
  inset-inline-start: var(--space-4);
  inset-block-end: var(--space-4);
}

.pinkless-badge[data-position="top-right"] {
  inset-inline-end: var(--space-4);
  inset-block-start: var(--space-4);
}

.pinkless-badge[data-position="top-left"] {
  inset-inline-start: var(--space-4);
  inset-block-start: var(--space-4);
}

.pinkless-badge p {
  margin: 0;
}

.pinkless-badge__headline {
  font-weight: 700;
}

.pinkless-badge__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.pinkless-badge__primary,
.pinkless-badge__dismiss {
  border: thin solid var(--surface-900);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.pinkless-badge__primary {
  background: var(--surface-900);
  color: var(--on-dark);
  text-decoration: none;
}

.pinkless-badge__dismiss {
  background: transparent;
  color: var(--ink);
}

.pinkless-badge summary {
  cursor: pointer;
  font-weight: 600;
}

.pinkless-badge details p {
  margin-block-start: var(--space-2);
}

.pinkless-badge :is(a, button, summary):focus-visible {
  outline: medium solid var(--surface-900);
  outline-offset: var(--space-2);
}
`;

const PROTECTED_SELECTORS = [
  '[data-testid*="price" i]',
  '[data-automation-id*="price" i]',
  '[aria-label*="price" i]',
  '[aria-label*="cart" i]',
  '[aria-label*="checkout" i]',
  '[aria-live]',
].join(',');

function badgeStyle(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.setAttribute('data-pinkless-styles', '');
  style.textContent = `${TOKENS_CSS}\n${BADGE_CSS}`;
  return style;
}

export function getBadgeShadowRoot(document: Document): ShadowRoot {
  let host = document.getElementById(BADGE_ROOT_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = BADGE_ROOT_ID;
    document.body.appendChild(host);
  }
  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  if (!shadowRoot.querySelector('style[data-pinkless-styles]')) {
    shadowRoot.prepend(badgeStyle(document));
  }
  return shadowRoot;
}

export function clearBadge(document: Document): void {
  const shadowRoot = document.getElementById(BADGE_ROOT_ID)?.shadowRoot;
  if (!shadowRoot) return;
  for (const node of shadowRoot.querySelectorAll('[data-pinkless-ui]')) node.remove();
}

function formatMoney(amountCents: number): string {
  const amount = BigInt(amountCents);
  const dollars = amount / 100n;
  const cents = String(amount % 100n).padStart(2, '0');
  return `$${dollars}.${cents}`;
}

function formatObservedAt(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(value),
  );
}

function overlaps(left: DOMRect, right: DOMRect): boolean {
  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

function protectedElements(document: Document): Element[] {
  const semantic = [...document.querySelectorAll(PROTECTED_SELECTORS)];
  const purchaseControls = [...document.querySelectorAll('button, [role="button"]')].filter(
    (element) => /add to cart|buy now|checkout/i.test(element.textContent ?? ''),
  );
  return [...new Set([...semantic, ...purchaseControls])].filter(
    (element) => !document.getElementById(BADGE_ROOT_ID)?.contains(element),
  );
}

function placeWithoutCollision(document: Document, badge: HTMLElement): boolean {
  const blockers = protectedElements(document)
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  const positions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const;
  for (const position of positions) {
    badge.dataset.position = position;
    const badgeRect = badge.getBoundingClientRect();
    if (badgeRect.width === 0 || badgeRect.height === 0) return true;
    if (!blockers.some((blocker) => overlaps(badgeRect, blocker))) return true;
  }
  return false;
}

export function renderBadge(
  document: Document,
  comparison: ShowComparison,
  onDismiss: () => void,
): boolean {
  const shadowRoot = getBadgeShadowRoot(document);
  clearBadge(document);

  const badge = document.createElement('aside');
  badge.className = 'pinkless-badge';
  badge.dataset.pinklessUi = '';
  badge.dataset.theme = 'light';
  badge.setAttribute('aria-label', 'Pinkless price comparison');

  const headline = document.createElement('p');
  headline.className = 'pinkless-badge__headline heading';
  headline.textContent = `Comparable alternative: save ${formatMoney(comparison.savings.amountCents)}`;

  const supporting = document.createElement('p');
  supporting.className = 'body';
  supporting.textContent = `${comparison.rationale} Alternative verified ${formatObservedAt(comparison.alternative.observedAt)}.`;

  const details = document.createElement('details');
  details.className = 'caption';
  const summary = document.createElement('summary');
  summary.textContent = 'Why this was matched';
  const detailText = document.createElement('p');
  detailText.textContent = `Matched by ${comparison.matchedBy.replaceAll('-', ' ')}. Both prices use ${comparison.current.priceContext.replaceAll('-', ' ')} fulfillment.`;
  details.append(summary, detailText);

  const actions = document.createElement('div');
  actions.className = 'pinkless-badge__actions';

  const primary = document.createElement('a');
  primary.className = 'pinkless-badge__primary body';
  primary.href = comparison.alternative.url;
  primary.target = '_blank';
  primary.rel = 'noopener noreferrer';
  primary.textContent = 'See alternative';
  primary.setAttribute(
    'aria-label',
    `See the verified alternative at ${RETAILER_LABELS[comparison.alternative.retailer]} in a new tab`,
  );

  const dismiss = document.createElement('button');
  dismiss.className = 'pinkless-badge__dismiss body';
  dismiss.type = 'button';
  dismiss.textContent = 'Not now';
  dismiss.setAttribute('aria-label', 'Dismiss this Pinkless comparison for the current page');
  dismiss.addEventListener('click', onDismiss);

  actions.append(primary, dismiss);
  badge.append(headline, supporting, details, actions);
  shadowRoot.appendChild(badge);

  if (placeWithoutCollision(document, badge)) return true;
  clearBadge(document);
  return false;
}
