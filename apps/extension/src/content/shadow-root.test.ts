// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { BADGE_ROOT_ID, mountBadgeRoot } from './shadow-root';
import { TOKENS_CSS } from './tokens';

// jsdom replaces the global URL class, which Node's fs rejects, so resolve from the string form.
const here = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(resolve(here, '../../../../packages/tokens/tokens.css'), 'utf8');

beforeEach(() => {
  document.body.replaceChildren();
});

describe('mountBadgeRoot', () => {
  it('embeds exactly the contents of packages/tokens/tokens.css', () => {
    expect(TOKENS_CSS).toBe(tokensCss);
  });

  it('mounts one host with a fixed ID and an open shadow root', () => {
    const { shadowRoot } = mountBadgeRoot();

    const hosts = document.querySelectorAll(`#${BADGE_ROOT_ID}`);
    expect(hosts).toHaveLength(1);
    expect(hosts[0]?.shadowRoot).toBe(shadowRoot);
  });

  it('injects the complete token CSS as the first child of the shadow root', () => {
    const { shadowRoot } = mountBadgeRoot();

    const first = shadowRoot.firstElementChild;
    expect(first?.tagName).toBe('STYLE');
    expect(first?.textContent).toBe(tokensCss);
  });

  it('renders inside a data-theme="light" container, the only place the variables resolve', () => {
    const { shadowRoot, container } = mountBadgeRoot();

    expect(container.getAttribute('data-theme')).toBe('light');
    expect(container.parentNode).toBe(shadowRoot);
  });

  it('places component CSS after the tokens so it can use the variables', () => {
    const css = '.badge { color: var(--ink); }';
    const { shadowRoot } = mountBadgeRoot(css);

    const styles = [...shadowRoot.querySelectorAll('style')];
    expect(styles.map((style) => style.textContent)).toEqual([tokensCss, css]);
  });

  it('never links external stylesheets or relies on the page for tokens', () => {
    const { shadowRoot } = mountBadgeRoot('.badge {}');

    expect(shadowRoot.querySelector('link')).toBeNull();
    expect(document.querySelector('link, style')).toBeNull();
  });

  it('is idempotent: remounting reuses the host, root, container, and tokens style', () => {
    const first = mountBadgeRoot('.a { color: var(--ink); }');
    const second = mountBadgeRoot('.b { color: var(--ink); }');

    expect(second.shadowRoot).toBe(first.shadowRoot);
    expect(second.container).toBe(first.container);
    expect(document.querySelectorAll(`#${BADGE_ROOT_ID}`)).toHaveLength(1);
    expect(second.shadowRoot.querySelectorAll('style[data-pinkless-tokens]')).toHaveLength(1);
    expect(second.shadowRoot.querySelectorAll('[data-pinkless-container]')).toHaveLength(1);
    // Component CSS is replaced, not appended.
    expect(second.shadowRoot.querySelectorAll('style[data-pinkless-component]')).toHaveLength(1);
    expect(second.shadowRoot.querySelector('style[data-pinkless-component]')?.textContent).toBe(
      '.b { color: var(--ink); }',
    );
  });

  it('keeps the tokens style first even when the root already holds other content', () => {
    const host = document.createElement('div');
    host.id = BADGE_ROOT_ID;
    document.body.append(host);
    const preexisting = host.attachShadow({ mode: 'open' });
    preexisting.append(document.createElement('section'));

    const { shadowRoot } = mountBadgeRoot();

    expect(shadowRoot).toBe(preexisting);
    expect(shadowRoot.firstElementChild?.tagName).toBe('STYLE');
  });
});
