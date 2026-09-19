// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NOW, makeShowOutcome } from '../../testing/outcome';
import { toBadgeModel } from './model';
import { COPY, createBadgeElement } from './view';

function render(onDismiss = vi.fn()) {
  const model = toBadgeModel(makeShowOutcome(), NOW)!;
  const card = createBadgeElement(document, model, { onDismiss });
  document.body.append(card);
  return { card, onDismiss, model };
}

function byText<T extends Element>(card: HTMLElement, selector: string, text: string): T {
  const match = [...card.querySelectorAll<T>(selector)].find((node) => node.textContent === text);
  if (!match) throw new Error(`No ${selector} with text "${text}"`);
  return match;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('badge content', () => {
  it('uses the exact REQUIREMENTS §6 strings', () => {
    const { card } = render();
    expect(card.querySelector('h2')?.textContent).toBe('Comparable alternative: save $2.40');
    expect(byText(card, 'a', 'See alternative')).toBeTruthy();
    expect(byText(card, 'button', 'Why this was matched')).toBeTruthy();
    expect(byText(card, 'button', 'Not now')).toBeTruthy();
  });

  it('states the savings in words, not only through color', () => {
    const { card } = render();
    expect(card.textContent).toContain('save $2.40');
    expect(card.textContent).toContain('$2.40 less at Walmart');
  });

  it('is a labelled landmark with a real heading', () => {
    const { card } = render();
    expect(card.tagName).toBe('ASIDE');
    expect(card.getAttribute('aria-label')).toBe(COPY.region);
    expect(card.querySelector('h2')).not.toBeNull();
  });

  it('is styled only through the shared type classes', () => {
    const { card } = render();
    expect(card.classList.contains('body')).toBe(true);
    expect(card.querySelector('h2')?.classList.contains('heading')).toBe(true);
    expect(card.querySelector('.brand')?.classList.contains('label')).toBe(true);
  });
});

describe('untrusted text', () => {
  it('renders markup in retailer/catalog strings as literal text', () => {
    const payload =
      '<img src=x onerror="window.__pwned = true"><script>window.__pwned = true</script>';
    const model = toBadgeModel(
      makeShowOutcome((o) => {
        o.rationale = payload;
        o.product.name = payload;
      }),
      NOW,
    )!;
    const card = createBadgeElement(document, model, { onDismiss: vi.fn() });
    document.body.append(card);

    expect(card.querySelector('img, script')).toBeNull();
    expect(card.textContent).toContain(payload);
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });
});

describe('primary action', () => {
  it('is a link that opens the alternative in a new tab without giving the page a handle', () => {
    const { card } = render();
    const link = byText<HTMLAnchorElement>(card, 'a', 'See alternative');
    expect(link.href).toBe('https://www.walmart.com/ip/sample-razor/123');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('has an accessible name that starts with its visible text', () => {
    const { card } = render();
    const label = byText(card, 'a', 'See alternative').getAttribute('aria-label');
    expect(label?.startsWith('See alternative')).toBe(true);
    expect(label).toContain('$12.59');
    expect(label).toContain('Walmart');
    expect(label).toContain('new tab');
  });
});

describe('"Why this was matched" disclosure', () => {
  it('starts collapsed and toggles aria-expanded together with the details', () => {
    const { card } = render();
    const toggle = byText<HTMLButtonElement>(card, 'button', COPY.why);
    const details = card.querySelector<HTMLElement>(`#${toggle.getAttribute('aria-controls')}`)!;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(details.hidden).toBe(true);

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(details.hidden).toBe(false);
    expect(details.textContent).toContain('Exact UPC');

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(details.hidden).toBe(true);
  });

  it('Escape closes an open disclosure and keeps focus where it was', () => {
    const { card, onDismiss } = render();
    const toggle = byText<HTMLButtonElement>(card, 'button', COPY.why);
    toggle.click();
    toggle.focus();

    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('leaves Escape to the page when nothing is open', () => {
    const { card } = render();
    const pageHandler = vi.fn();
    document.addEventListener('keydown', pageHandler);
    byText(card, 'button', COPY.why).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    document.removeEventListener('keydown', pageHandler);
    expect(pageHandler).toHaveBeenCalledTimes(1);
  });
});

describe('"Not now"', () => {
  it('calls onDismiss and has a descriptive accessible name starting with its text', () => {
    const { card, onDismiss } = render();
    const dismiss = byText<HTMLButtonElement>(card, 'button', COPY.dismiss);
    expect(dismiss.getAttribute('aria-label')?.startsWith('Not now')).toBe(true);
    dismiss.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('page-safety and accessibility invariants (REQUIREMENTS §6)', () => {
  it('does not take focus when it renders', () => {
    const before = document.createElement('button');
    document.body.append(before);
    before.focus();
    render();
    expect(document.activeElement).toBe(before);
  });

  it('has no live region, no modal semantics, no alert role, no tabindex', () => {
    const { card } = render();
    expect(card.querySelector('[aria-live], [role="alert"], [role="alertdialog"]')).toBeNull();
    expect(card.querySelector('[aria-modal], [role="dialog"]')).toBeNull();
    expect(card.querySelector('[tabindex]')).toBeNull();
  });

  it('exposes only native links and buttons as controls', () => {
    const { card } = render();
    const controls = [...card.querySelectorAll('a, button, [role="button"], [onclick]')];
    expect(controls.map((node) => node.tagName)).toEqual(['A', 'BUTTON', 'BUTTON']);
    expect(card.querySelectorAll('div[role], span[role]')).toHaveLength(0);
  });

  it('gives every button an explicit type so it never submits a host-page form', () => {
    const { card } = render();
    for (const button of card.querySelectorAll('button')) expect(button.type).toBe('button');
  });

  it('never marks the badge as an image-only or icon-only control', () => {
    const { card } = render();
    expect(card.querySelector('img, svg')).toBeNull();
  });
});
