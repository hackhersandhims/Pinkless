import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import { BADGE_ROOT_ID, clearBadge, renderBadge } from './badge.js';
import { showComparison } from './test-data.js';

describe('comparison badge', () => {
  it('renders one accessible Shadow DOM badge and opens the vetted URL in a new tab', () => {
    const window = new Window({ url: 'https://www.cvs.com/shop/item-prodid-123456' });
    const document = window.document as unknown as Document;
    const dismiss = vi.fn();

    expect(renderBadge(document, showComparison(), dismiss)).toBe(true);
    expect(renderBadge(document, showComparison(), dismiss)).toBe(true);
    expect(document.querySelectorAll(`#${BADGE_ROOT_ID}`)).toHaveLength(1);

    const shadowRoot = document.getElementById(BADGE_ROOT_ID)?.shadowRoot;
    expect(shadowRoot?.textContent).toContain("Men's alternative: save $4.00");
    expect(shadowRoot?.textContent).toContain("Men's Sample Razor at CVS");
    expect(shadowRoot?.textContent).toContain('Why this was matched');
    expect(shadowRoot?.querySelector('img')?.alt).toBe('Pinkless');
    const link = shadowRoot?.querySelector<HTMLAnchorElement>('a');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
    expect(link?.href).toBe('https://www.cvs.com/shop/mens-razor-prodid-cvs-mens-razor-1');

    shadowRoot?.querySelector<HTMLButtonElement>('.pinkless-badge__dismiss')?.click();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('collapses to a right-edge control that can be expanded again', () => {
    const window = new Window({ url: 'https://www.cvs.com/shop/item-prodid-123456' });
    const document = window.document as unknown as Document;

    renderBadge(document, showComparison(), () => undefined);
    const badge = document
      .getElementById(BADGE_ROOT_ID)
      ?.shadowRoot?.querySelector<HTMLElement>('[data-pinkless-ui]');
    const collapse = document
      .getElementById(BADGE_ROOT_ID)
      ?.shadowRoot?.querySelector<HTMLButtonElement>('.pinkless-badge__collapse');

    collapse?.click();
    expect(badge?.dataset.collapsed).toBe('true');

    document
      .getElementById(BADGE_ROOT_ID)
      ?.shadowRoot?.querySelector<HTMLButtonElement>('.pinkless-badge__expand')
      ?.click();
    expect(badge?.dataset.collapsed).toBe('false');
    expect(badge?.dataset.position).toBe('right');
  });

  it('clears stale comparison content without leaving a visible badge', () => {
    const window = new Window();
    const document = window.document as unknown as Document;
    renderBadge(document, showComparison(), () => undefined);
    clearBadge(document);
    expect(
      document.getElementById(BADGE_ROOT_ID)?.shadowRoot?.querySelector('[data-pinkless-ui]'),
    ).toBeNull();
  });
});
