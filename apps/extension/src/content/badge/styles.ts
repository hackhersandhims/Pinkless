/**
 * Badge component CSS. It is injected into the shadow root AFTER the token stylesheet and only
 * ever applies inside that root, so class names here cannot collide with the retailer's.
 *
 * Tokens only (DESIGN_SYSTEM.md): no raw colors, font sizes, or spacing. The one hard-coded
 * length is the card width, for which the token scale has no value. Border and outline widths
 * are structural, as in the Marketplace.
 *
 * Colors carry no meaning on their own: savings are always stated in words. There is no
 * approved CTA color, so hierarchy comes from the existing palette and shape:
 *   primary  = surface-900 fill on on-dark   (same placeholder the Marketplace uses)
 *   secondary = bordered, transparent
 *   quiet    = borderless, underlined
 */
export const BADGE_CSS = `
*,
*::before,
*::after {
  box-sizing: border-box;
}

.pinkless {
  position: fixed;
  inset-block-end: var(--space-4);
  /* Keep the full comparison on the page's right edge, away from Kroger's main product copy. */
  inset-inline-end: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(360px, calc(100vw - var(--space-4) * 2));
  max-height: calc(100vh - var(--space-4) * 2);
  overflow-y: auto;
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-100);
  color: var(--ink);
  text-align: start;
  overflow-wrap: anywhere;
}

.pinkless h2,
.pinkless p,
.pinkless dl,
.pinkless dd {
  margin: 0;
}

/* Keeps "save $2.40" together instead of orphaning the amount on its own line. */
.pinkless h2 {
  text-wrap: balance;
}

.brand {
  align-self: flex-start;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--surface-pink);
  color: var(--ink);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--ink);
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  appearance: none;
}

.action:hover {
  background: var(--surface-pink);
}

.action:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.action-primary {
  border-color: var(--surface-900);
  background: var(--surface-900);
  color: var(--on-dark);
}

.action-primary:hover {
  background: var(--surface-900);
  text-decoration: underline;
}

.action[aria-expanded="true"] {
  background: var(--surface-pink);
}

/* No horizontal padding so the text aligns with the card's content edge when it wraps to its own row. */
.action-quiet {
  padding-inline: 0;
  border-color: transparent;
  text-decoration: underline;
}

.details {
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.details[hidden] {
  display: none;
}

.details dl {
  display: grid;
  gap: var(--space-2);
}

.details dt {
  color: var(--ink);
}
`;
