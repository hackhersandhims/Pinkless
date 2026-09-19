import { RETAILER_LABELS } from '../shared/config.js';
import type { ShowComparison } from '../shared/types.js';
import { TOKENS_CSS } from './tokens.js';

export const BADGE_ROOT_ID = 'pinkless-badge-root';

const BADGE_CSS = `
:host {
  all: initial;
}

.pinkless-badge {
  --panel-background: var(--on-dark-muted);
  --panel-foreground: var(--on-dark);
  --panel-border: var(--on-dark);
  --panel-action-background: var(--surface-900);
  --panel-action-foreground: var(--on-dark);

  position: fixed;
  z-index: 2147483647;
  display: grid;
  gap: var(--space-3);
  max-inline-size: calc(100vw - var(--space-6) - var(--space-6));
  padding: var(--space-4);
  border: thin solid var(--panel-border);
  border-radius: calc(var(--radius-lg) + var(--space-2));
  background: var(--panel-background);
  color: var(--panel-foreground);
  font-family: var(--font-sans);
  box-shadow: 0 var(--space-2) var(--space-6) var(--border);
}

.pinkless-badge[data-position="right"] {
  inset-inline-end: 0;
  inset-block: 0;
  inline-size: calc(var(--space-6) * 14);
  overflow-y: auto;
  scroll-behavior: auto;
  transform: none;
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}

@media (prefers-color-scheme: dark) {
  .pinkless-badge {
    --panel-background: var(--surface-100);
    --panel-foreground: var(--surface-pink);
    --panel-border: var(--surface-pink);
    --panel-action-background: var(--surface-pink);
    --panel-action-foreground: var(--surface-900);
  }
}

.pinkless-badge[data-collapsed="true"] {
  inset-block-start: 50%;
  inset-block-end: auto;
  inline-size: auto;
  padding: var(--space-2);
  box-shadow: none;
  transform: translateY(-50%);
}

.pinkless-badge[data-collapsed="true"] > :not(.pinkless-badge__expand) {
  display: none;
}

.pinkless-badge:not([data-collapsed="true"]) > .pinkless-badge__expand {
  display: none;
}

.pinkless-badge p {
  margin: 0;
}

.pinkless-badge__header,
.pinkless-badge__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.pinkless-badge__header {
  justify-content: space-between;
}

.pinkless-badge__headline {
  font-family: var(--font-brand);
}

.pinkless-badge__logo {
  display: block;
  inline-size: calc(var(--space-6) * 6);
  max-inline-size: 100%;
  border-radius: var(--radius-sm);
}

.pinkless-badge__collapse,
.pinkless-badge__expand {
  border: thin solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  background: transparent;
  color: var(--panel-foreground);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.pinkless-badge__expand {
  justify-self: center;
  border-color: transparent;
  background: transparent;
  opacity: 0.8;
}

.pinkless-badge__primary,
.pinkless-badge__dismiss {
  border: thin solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.pinkless-badge__primary {
  background: var(--panel-action-background);
  color: var(--panel-action-foreground);
  text-decoration: none;
}

.pinkless-badge__dismiss {
  background: transparent;
  color: var(--panel-foreground);
}

.pinkless-badge summary {
  cursor: pointer;
  font-weight: 600;
}

.pinkless-badge details p {
  margin-block-start: var(--space-2);
}

.pinkless-badge :is(a, button, summary):focus-visible {
  outline: medium solid var(--panel-foreground);
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
  badge.dataset.position = 'right';
  const badgeRect = badge.getBoundingClientRect();
  return (
    badgeRect.width === 0 ||
    badgeRect.height === 0 ||
    !blockers.some((blocker) => overlaps(badgeRect, blocker))
  );
}

function setCollapsed(badge: HTMLElement, collapsed: boolean): void {
  badge.dataset.collapsed = String(collapsed);
}

function logoUrl(): string {
  return typeof chrome === 'undefined'
    ? 'assets/logo.png'
    : chrome.runtime.getURL('assets/logo.png');
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
  setCollapsed(badge, false);
  badge.setAttribute('aria-label', 'Pinkless price comparison');

  const header = document.createElement('div');
  header.className = 'pinkless-badge__header';

  const logo = document.createElement('img');
  logo.className = 'pinkless-badge__logo';
  logo.src = logoUrl();
  logo.alt = 'Pinkless';

  const collapse = document.createElement('button');
  collapse.className = 'pinkless-badge__collapse label';
  collapse.type = 'button';
  collapse.textContent = 'Hide';
  collapse.setAttribute('aria-label', 'Collapse Pinkless price comparison');
  collapse.addEventListener('click', () => setCollapsed(badge, true));

  header.append(logo, collapse);

  const expand = document.createElement('button');
  expand.className = 'pinkless-badge__expand label';
  expand.type = 'button';
  expand.textContent = '‹';
  expand.setAttribute('aria-label', 'Expand Pinkless price comparison');
  expand.addEventListener('click', () => setCollapsed(badge, false));

  const headline = document.createElement('p');
  headline.className = 'pinkless-badge__headline heading';
  headline.textContent = `Men's alternative: save ${formatMoney(comparison.savings.amountCents)}`;

  const supporting = document.createElement('p');
  supporting.className = 'body';
  supporting.textContent = `${comparison.alternativeProduct.name} at ${RETAILER_LABELS[comparison.current.retailer]}. ${comparison.rationale} Price verified ${formatObservedAt(comparison.alternative.observedAt)}.`;

  const details = document.createElement('details');
  details.className = 'caption';
  const summary = document.createElement('summary');
  summary.textContent = 'Why this was matched';
  const detailText = document.createElement('p');
  detailText.textContent = `Current product matched by ${comparison.matchedBy.replaceAll('-', ' ')}. Reviewed attributes: ${comparison.matchedAttributes.join(', ')}. Both prices use ${comparison.current.priceContext.replaceAll('-', ' ')} fulfillment at the same retailer.`;
  details.append(summary, detailText);

  const actions = document.createElement('div');
  actions.className = 'pinkless-badge__actions';

  const primary = document.createElement('a');
  primary.className = 'pinkless-badge__primary body';
  primary.href = comparison.alternative.url;
  primary.target = '_blank';
  primary.rel = 'noopener noreferrer';
  primary.textContent = "See men's alternative";
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
  badge.append(header, expand, headline, supporting, details, actions);
  shadowRoot.appendChild(badge);

  if (placeWithoutCollision(document, badge)) return true;
  clearBadge(document);
  return false;
}
