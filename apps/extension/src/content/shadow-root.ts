import { TOKENS_CSS } from './tokens';

/** Fixed, unique host ID: a remount replaces this element, never appends a second one (REQUIREMENTS §7). */
export const BADGE_ROOT_ID = 'pinkless-badge-root';

export type BadgeMount = {
  shadowRoot: ShadowRoot;
  /** Render ALL badge markup inside this element. */
  container: HTMLElement;
};

/**
 * Creates (or reuses) the badge's Shadow DOM root with the design tokens inlined.
 *
 * A shadow root inherits nothing from the retailer page, so the full tokens.css is injected into
 * the root's own <style>. Two consequences to know before building on this:
 *
 * 1. `tokens.css` declares its variables on `:root, [data-theme="light"]`. `:root` never matches
 *    inside a shadow tree, so the variables only exist on and below an element carrying
 *    `data-theme="light"`. That element is `container`. Markup appended to `shadowRoot` directly
 *    gets NO `var(--…)` values (the `.display`/`.body`/… classes still work; they don't need them).
 * 2. The tokens `<style>` is always the first child, so component CSS passed as `componentCss`
 *    (or added afterwards) comes later in the cascade and can use the variables.
 *
 * Calling this again reuses the same host, root, container, and tokens style.
 */
export function mountBadgeRoot(componentCss?: string, doc: Document = document): BadgeMount {
  let host = doc.getElementById(BADGE_ROOT_ID);
  if (!host) {
    host = doc.createElement('div');
    host.id = BADGE_ROOT_ID;
    (doc.body ?? doc.documentElement).appendChild(host);
  }

  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  let tokensStyle = shadowRoot.querySelector<HTMLStyleElement>('style[data-pinkless-tokens]');
  if (!tokensStyle) {
    tokensStyle = doc.createElement('style');
    tokensStyle.setAttribute('data-pinkless-tokens', '');
    tokensStyle.textContent = TOKENS_CSS;
    shadowRoot.prepend(tokensStyle);
  }

  if (componentCss !== undefined) {
    let componentStyle = shadowRoot.querySelector<HTMLStyleElement>(
      'style[data-pinkless-component]',
    );
    if (!componentStyle) {
      componentStyle = doc.createElement('style');
      componentStyle.setAttribute('data-pinkless-component', '');
      tokensStyle.after(componentStyle);
    }
    componentStyle.textContent = componentCss;
  }

  let container = shadowRoot.querySelector<HTMLElement>('[data-pinkless-container]');
  if (!container) {
    container = doc.createElement('div');
    container.setAttribute('data-pinkless-container', '');
    container.setAttribute('data-theme', 'light');
    shadowRoot.append(container);
  }

  return { shadowRoot, container };
}
