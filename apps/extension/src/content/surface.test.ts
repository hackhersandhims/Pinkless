// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOW, makeShowOutcome } from '../testing/outcome';
import { toBadgeModel } from './badge/model';
import { BADGE_ROOT_ID } from './shadow-root';
import { createBadgeSurface } from './surface';

const model = toBadgeModel(makeShowOutcome(), NOW)!;
const host = () => document.getElementById(BADGE_ROOT_ID);
const cards = () => host()?.shadowRoot?.querySelectorAll('.pinkless') ?? [];

beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('createBadgeSurface', () => {
  it('renders the badge inside the Shadow DOM, not in the page DOM', () => {
    const surface = createBadgeSurface();
    surface.show(model, vi.fn());

    expect(cards()).toHaveLength(1);
    expect(document.querySelector('.pinkless')).toBeNull();
    expect(document.body.textContent).not.toContain('Comparable alternative');
  });

  it('renders inside the data-theme container so token variables resolve', () => {
    createBadgeSurface().show(model, vi.fn());
    const card = host()!.shadowRoot!.querySelector('.pinkless')!;
    expect(card.closest('[data-theme="light"]')).not.toBeNull();
  });

  it('puts token CSS first, then badge CSS, in the shadow root', () => {
    createBadgeSurface().show(model, vi.fn());
    const styles = [...host()!.shadowRoot!.querySelectorAll('style')];
    expect(
      styles.map((style) => style.getAttribute('data-pinkless-tokens') ?? 'component'),
    ).toEqual(['', 'component']);
    expect(styles[1]?.textContent).toContain('.pinkless');
  });

  it('adds no stylesheet or style element to the retailer page', () => {
    createBadgeSurface().show(model, vi.fn());
    expect(document.querySelectorAll('style, link[rel="stylesheet"]')).toHaveLength(0);
  });

  it('renders exactly one badge however many times it is shown', () => {
    const surface = createBadgeSurface();
    for (let i = 0; i < 5; i += 1) surface.show(model, vi.fn());

    expect(document.querySelectorAll(`#${BADGE_ROOT_ID}`)).toHaveLength(1);
    expect(cards()).toHaveLength(1);
  });

  it('isolates the host from retailer CSS with important inline styles', () => {
    createBadgeSurface().show(model, vi.fn());
    const style = host()!.style;

    for (const property of ['all', 'position', 'width', 'height', 'z-index']) {
      expect(style.getPropertyPriority(property), property).toBe('important');
    }
    expect(style.getPropertyValue('all')).toBe('initial');
    expect(style.getPropertyValue('position')).toBe('fixed');
    // On the host, not inside the shadow tree: the host is its own stacking context.
    expect(style.getPropertyValue('z-index')).toBe('10000');
  });

  it('hide() removes the host entirely', () => {
    const surface = createBadgeSurface();
    surface.show(model, vi.fn());
    expect(surface.isVisible()).toBe(true);

    surface.hide();
    expect(host()).toBeNull();
    expect(surface.isVisible()).toBe(false);
  });

  it('hide() with nothing mounted is a no-op that touches nothing', () => {
    const surface = createBadgeSurface();
    const observed = vi.fn();
    const observer = new MutationObserver(observed);
    observer.observe(document, { childList: true, subtree: true, attributes: true });

    surface.hide();

    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it('passes the dismiss handler through to the badge', () => {
    const onDismiss = vi.fn();
    createBadgeSurface().show(model, onDismiss);
    const dismiss = [...host()!.shadowRoot!.querySelectorAll('button')].find(
      (button) => button.textContent === 'Not now',
    );
    dismiss!.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('two instances of the script in one page', () => {
  it('lets a newer instance take over an existing badge; the older one is replaced', () => {
    const older = createBadgeSurface();
    older.show(model, vi.fn());
    expect(older.isReplaced()).toBe(false);

    const newer = createBadgeSurface();

    expect(older.isReplaced()).toBe(true);
    expect(newer.isReplaced()).toBe(false);
  });

  it('a replaced instance can neither show nor hide', () => {
    const older = createBadgeSurface();
    older.show(model, vi.fn());
    const newer = createBadgeSurface();
    newer.show(model, vi.fn());

    older.hide();
    expect(host()).not.toBeNull();

    older.show(model, vi.fn());
    expect(cards()).toHaveLength(1);
  });

  it('still yields a single badge when both instances race to create the host', () => {
    const first = createBadgeSurface();
    const second = createBadgeSurface();

    first.show(model, vi.fn());
    second.show(model, vi.fn());

    expect(document.querySelectorAll(`#${BADGE_ROOT_ID}`)).toHaveLength(1);
    expect(cards()).toHaveLength(1);
    expect(second.isReplaced()).toBe(true);
  });
});
