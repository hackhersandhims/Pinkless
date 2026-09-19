import type { BadgeModel } from './model.js';

/** Copy fixed by REQUIREMENTS §6; do not paraphrase per component. */
export const COPY = {
  brand: 'Pinkless',
  region: 'Pinkless price comparison',
  primary: "See men's alternative",
  why: 'Why this was matched',
  dismiss: 'Not now',
  dismissLabel: 'Not now, hide the Pinkless comparison on this page',
} as const;

const DETAILS_ID = 'pinkless-why';

export type BadgeHandlers = {
  /** "Not now": suppress the badge for the current page only. */
  onDismiss: () => void;
};

function element<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  // textContent only: every string here originates outside the extension.
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Builds the badge DOM. Deliberately inert about the host page:
 *  - no focus is taken on creation or update;
 *  - no live region, no modal semantics, no tabindex;
 *  - the primary action is a real link that opens a new tab, never navigating the page away.
 */
export function createBadgeElement(
  doc: Document,
  model: BadgeModel,
  handlers: BadgeHandlers,
): HTMLElement {
  const card = element(doc, 'aside', 'pinkless body');
  card.setAttribute('aria-label', COPY.region);

  const brand = element(doc, 'p', 'brand label', COPY.brand);
  const headline = element(doc, 'h2', 'heading', model.headline);
  const productLine = element(doc, 'p', 'body', model.productLine);
  const supporting = element(doc, 'p', 'caption', model.supporting);

  const primary = element(doc, 'a', 'action action-primary body', COPY.primary);
  primary.href = model.action.href;
  primary.target = '_blank';
  primary.rel = 'noopener noreferrer';
  primary.setAttribute('aria-label', model.action.ariaLabel);

  const why = element(doc, 'button', 'action body', COPY.why);
  why.type = 'button';
  why.setAttribute('aria-expanded', 'false');
  why.setAttribute('aria-controls', DETAILS_ID);

  const dismiss = element(doc, 'button', 'action action-quiet body', COPY.dismiss);
  dismiss.type = 'button';
  dismiss.setAttribute('aria-label', COPY.dismissLabel);

  const details = element(doc, 'div', 'details');
  details.id = DETAILS_ID;
  details.hidden = true;
  const list = element(doc, 'dl');
  for (const { term, descriptions } of model.details) {
    const row = element(doc, 'div');
    row.append(
      element(doc, 'dt', 'label', term),
      ...descriptions.map((description) => element(doc, 'dd', 'caption', description)),
    );
    list.append(row);
  }
  details.append(list);

  const setExpanded = (expanded: boolean): void => {
    details.hidden = !expanded;
    why.setAttribute('aria-expanded', String(expanded));
  };

  why.addEventListener('click', () => setExpanded(details.hidden));
  dismiss.addEventListener('click', () => handlers.onDismiss());
  // Escape closes only the transient disclosure. It never dismisses the badge, and it is
  // ignored (left to the page) when there is nothing open to close.
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !details.hidden) {
      event.stopPropagation();
      setExpanded(false);
    }
  });

  const actions = element(doc, 'div', 'actions');
  actions.append(primary, why, dismiss);
  card.append(brand, headline, productLine, supporting, actions, details);
  return card;
}
