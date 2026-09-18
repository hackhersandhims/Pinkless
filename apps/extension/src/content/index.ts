import { TOKENS_CSS } from './tokens';

// The content-script pipeline (Target adapter → matcher → badge) is added in later phases.
// BADGE_ROOT_ID must stay a fixed, unique value per REQUIREMENTS.md §7
// ("Duplicate/injected UI collision"): the badge mount replaces this element
// rather than appending a new one.
export const BADGE_ROOT_ID = 'pinkless-badge-root';

// Creates (or reuses) the badge's Shadow DOM root with design tokens inlined
// into its own <style> tag, since a shadow root cannot inherit page-level CSS.
export function getBadgeShadowRoot(): ShadowRoot {
  let host = document.getElementById(BADGE_ROOT_ID);

  if (!host) {
    host = document.createElement('div');
    host.id = BADGE_ROOT_ID;
    document.body.appendChild(host);
  }

  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  if (!shadowRoot.querySelector('style[data-pinkless-tokens]')) {
    const style = document.createElement('style');
    style.setAttribute('data-pinkless-tokens', '');
    style.textContent = TOKENS_CSS;
    shadowRoot.appendChild(style);
  }

  return shadowRoot;
}
