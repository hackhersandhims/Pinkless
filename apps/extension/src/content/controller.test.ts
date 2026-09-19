// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComparisonOutcome, ProductView } from '../shared/types';
import { NOW, makeProductView, makeShowOutcome } from '../testing/outcome';
import type { BadgeModel } from './badge/model';
import { createController, type Controller, type ControllerDeps } from './controller';
import { BADGE_ROOT_ID } from './shadow-root';
import { createBadgeSurface, type BadgeSurface } from './surface';

const DEBOUNCE = 300;
const MAX_WAIT = 1500;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeSurface() {
  const surface = {
    show: vi.fn<BadgeSurface['show']>(),
    hide: vi.fn<BadgeSurface['hide']>(),
    isVisible: vi.fn<BadgeSurface['isVisible']>(() => true),
    isReplaced: vi.fn<BadgeSurface['isReplaced']>(() => false),
  };
  return surface satisfies BadgeSurface;
}

const shownHeadlines = (surface: ReturnType<typeof fakeSurface>): string[] =>
  surface.show.mock.calls.map(([model]: [BadgeModel, () => void]) => model.headline);

const cheaperBy = (cents: number): ComparisonOutcome =>
  makeShowOutcome((o) => {
    o.alternative.price.amountCents = 1499 - cents;
    o.savings.amountCents = cents;
  });

let controller: Controller | undefined;
let currentView: ProductView | null;
let currentPage: string;

function setup(overrides: Partial<ControllerDeps> = {}) {
  const surface = fakeSurface();
  // Always wrap, so the returned mock is the one the controller actually calls.
  const compare = vi.fn<ControllerDeps['compare']>(
    overrides.compare ?? (async () => makeShowOutcome()),
  );
  const getProductView = vi.fn<ControllerDeps['getProductView']>(
    overrides.getProductView ?? (() => currentView),
  );
  controller = createController({
    surface,
    debounceMs: DEBOUNCE,
    maxWaitMs: MAX_WAIT,
    pageKey: () => currentPage,
    ...overrides,
    getProductView,
    compare,
  });
  return { surface, compare, getProductView, controller };
}

/** Lets the MutationObserver microtask run (it schedules the debounce timer). */
async function pageMutates(): Promise<void> {
  document.body.append(document.createElement('div'));
  await vi.advanceTimersByTimeAsync(0);
}

const settle = (ms: number = DEBOUNCE) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  document.body.replaceChildren();
  currentView = makeProductView();
  currentPage = 'https://www.kroger.com/p/sample-razor/0001';
});

afterEach(() => {
  controller?.stop();
  controller = undefined;
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('what reaches the screen', () => {
  it('shows one badge for an eligible comparison', async () => {
    const { surface, compare } = setup();
    controller!.start();
    await settle(0);

    expect(compare).toHaveBeenCalledTimes(1);
    expect(shownHeadlines(surface)).toEqual(["Men's alternative: save $2.40"]);
  });

  it.each<[string, ComparisonOutcome]>([
    ['no-match', { status: 'no-match', reason: 'no-positive-savings' }],
    ['suppressed', { status: 'suppressed', reason: 'provider-unavailable' }],
    [
      'a show outcome that fails the sanity checks',
      makeShowOutcome((o) => void (o.savings.amountCents = 1)),
    ],
  ])('stays silent for %s', async (_label, outcome) => {
    const { surface } = setup({ compare: async () => outcome });
    controller!.start();
    await settle(0);

    expect(surface.show).not.toHaveBeenCalled();
  });

  it('stays silent, and never asks the API, when the page is not a supported product', async () => {
    currentView = null;
    const { surface, compare } = setup();
    controller!.start();
    await settle(0);

    expect(compare).not.toHaveBeenCalled();
    expect(surface.show).not.toHaveBeenCalled();
  });

  it('stays silent when the adapter throws', async () => {
    const { surface, compare } = setup({
      getProductView: () => {
        throw new Error('retailer changed its DOM');
      },
    });
    controller!.start();
    await settle(0);

    expect(compare).not.toHaveBeenCalled();
    expect(surface.show).not.toHaveBeenCalled();
  });

  it('stays silent, without an unhandled rejection, when the comparison request fails', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const { surface } = setup({
      compare: async () => {
        throw new Error('network down');
      },
    });
    controller!.start();
    await settle(0);
    await vi.advanceTimersByTimeAsync(10);
    process.off('unhandledRejection', unhandled);

    expect(surface.show).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('does not retry a failed comparison on every DOM change, but does after a minute', async () => {
    const { compare } = setup({
      compare: vi.fn(async () => {
        throw new Error('network down');
      }),
    });
    controller!.start();
    await settle(0);
    expect(compare).toHaveBeenCalledTimes(1);

    await pageMutates();
    await settle();
    expect(compare).toHaveBeenCalledTimes(1);

    await settle(60_000);
    await pageMutates();
    await settle();
    expect(compare).toHaveBeenCalledTimes(2);
  });
});

describe('never a stale badge', () => {
  it('removes the badge immediately when the variant changes, before the new answer arrives', async () => {
    const pending = deferred<ComparisonOutcome>();
    const { surface, compare } = setup();
    controller!.start();
    await settle(0);
    expect(surface.show).toHaveBeenCalledTimes(1);

    compare.mockReturnValueOnce(pending.promise);
    currentView = makeProductView({ selectedVariant: '8 ct', currentPriceCents: 2499 });
    surface.hide.mockClear();
    await pageMutates();
    await settle();

    expect(surface.hide).toHaveBeenCalled();
    expect(surface.show).toHaveBeenCalledTimes(1); // nothing new yet
  });

  it('discards an answer for a variant the user has already left', async () => {
    const stale = deferred<ComparisonOutcome>();
    const fresh = deferred<ComparisonOutcome>();
    const { surface, compare } = setup({ compare: vi.fn() });
    compare.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);

    controller!.start(); // variant A: request 1 in flight
    await settle(0);

    currentView = makeProductView({ selectedVariant: '8 ct' }); // variant B: request 2
    await pageMutates();
    await settle();
    expect(compare).toHaveBeenCalledTimes(2);

    fresh.resolve(cheaperBy(100));
    await settle(0);
    stale.resolve(cheaperBy(500)); // the slow answer for A arrives last
    await settle(0);

    expect(shownHeadlines(surface)).toEqual(["Men's alternative: save $1.00"]);
  });

  it('discards an in-flight answer if the page stops being a product page', async () => {
    const pending = deferred<ComparisonOutcome>();
    const { surface } = setup({ compare: () => pending.promise });
    controller!.start();
    await settle(0);

    currentView = null;
    await pageMutates();
    await settle();
    pending.resolve(makeShowOutcome());
    await settle(0);

    expect(surface.show).not.toHaveBeenCalled();
  });

  it('retires the badge when the offer expires, then asks again', async () => {
    const soon = makeShowOutcome((o) => {
      o.alternative.expiresAt = new Date(NOW.valueOf() + 60_000).toISOString();
    });
    const { surface, compare } = setup({ compare: vi.fn(async () => soon) });
    controller!.start();
    await settle(0);
    expect(surface.show).toHaveBeenCalledTimes(1);
    surface.hide.mockClear();

    await settle(60_000 + DEBOUNCE);

    expect(surface.hide).toHaveBeenCalled();
    expect(compare).toHaveBeenCalledTimes(2);
    // The refreshed answer is also expired, so the badge must stay gone.
    expect(surface.show).toHaveBeenCalledTimes(1);
  });

  it('puts the same badge back if the page framework wiped it, without asking the API again', async () => {
    const { surface, compare } = setup();
    controller!.start();
    await settle(0);
    expect(surface.show).toHaveBeenCalledTimes(1);

    surface.isVisible.mockReturnValue(false);
    await pageMutates();
    await settle();

    expect(surface.show).toHaveBeenCalledTimes(2);
    expect(surface.show.mock.calls[1]?.[0]).toBe(surface.show.mock.calls[0]?.[0]);
    expect(compare).toHaveBeenCalledTimes(1);
  });
});

describe('"Not now"', () => {
  it('hides the badge and keeps it hidden on this page, even across variant changes', async () => {
    const { surface, compare } = setup();
    controller!.start();
    await settle(0);
    surface.show.mock.calls[0]![1](); // the user clicks "Not now"
    expect(surface.hide).toHaveBeenCalled();

    currentView = makeProductView({ selectedVariant: '8 ct' });
    await pageMutates();
    await settle();

    expect(compare).toHaveBeenCalledTimes(1);
    expect(surface.show).toHaveBeenCalledTimes(1);
  });

  it('applies to the current page only: another page can show a badge again', async () => {
    const { surface } = setup();
    controller!.start();
    await settle(0);
    surface.show.mock.calls[0]![1]();

    currentPage = 'https://www.kroger.com/p/other-product/0002';
    currentView = makeProductView({ canonicalUrl: currentPage, productId: '0002' });
    await pageMutates();
    await settle();

    expect(surface.show).toHaveBeenCalledTimes(2);
  });
});

describe('cost on the retailer page', () => {
  it('collapses a burst of DOM churn into one re-evaluation', async () => {
    const { getProductView } = setup();
    controller!.start();
    await settle(0);
    expect(getProductView).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 25; i += 1) {
      await pageMutates();
      await settle(50);
    }
    await settle(DEBOUNCE);

    expect(getProductView).toHaveBeenCalledTimes(2);
  });

  it('still evaluates during constant churn, no later than the max wait', async () => {
    const { getProductView } = setup();
    controller!.start();
    await settle(0);
    getProductView.mockClear();

    for (let elapsed = 0; elapsed <= MAX_WAIT + 100; elapsed += 100) {
      await pageMutates();
      await settle(100);
    }

    expect(getProductView).toHaveBeenCalled();
  });

  it('does not ask the API again for an unchanged page', async () => {
    const { compare } = setup();
    controller!.start();
    await settle(0);

    for (let i = 0; i < 5; i += 1) {
      await pageMutates();
      await settle();
    }

    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('re-evaluates when the price changes on the same product', async () => {
    const { compare } = setup();
    controller!.start();
    await settle(0);

    currentView = makeProductView({ currentPriceCents: 1399 });
    await pageMutates();
    await settle();

    expect(compare).toHaveBeenCalledTimes(2);
  });

  it('start() twice does not double-observe', async () => {
    const { getProductView } = setup();
    controller!.start();
    controller!.start();
    await settle(0);

    expect(getProductView).toHaveBeenCalledTimes(1);
  });

  it('reacts to client-side navigation (popstate) and stops on stop()', async () => {
    const { getProductView } = setup();
    controller!.start();
    await settle(0);
    getProductView.mockClear();

    window.dispatchEvent(new PopStateEvent('popstate'));
    await settle();
    expect(getProductView).toHaveBeenCalledTimes(1);

    controller!.stop();
    getProductView.mockClear();
    window.dispatchEvent(new PopStateEvent('popstate'));
    await pageMutates();
    await settle(MAX_WAIT);
    expect(getProductView).not.toHaveBeenCalled();
  });
});

describe('orphaned or superseded scripts', () => {
  it('goes dormant and removes its badge once the extension context is invalidated', async () => {
    let alive = true;
    const { surface, getProductView } = setup({ isContextAlive: () => alive });
    controller!.start();
    await settle(0);
    surface.hide.mockClear();

    alive = false;
    await pageMutates();
    await settle();
    expect(surface.hide).toHaveBeenCalled();

    getProductView.mockClear();
    await pageMutates();
    await settle(MAX_WAIT);
    expect(getProductView).not.toHaveBeenCalled();
  });

  it('stops without touching the page once a newer instance owns the root', async () => {
    const { surface, getProductView } = setup();
    controller!.start();
    await settle(0);
    surface.hide.mockClear();
    surface.show.mockClear();

    surface.isReplaced.mockReturnValue(true);
    await pageMutates();
    await settle();

    expect(surface.hide).not.toHaveBeenCalled();
    expect(surface.show).not.toHaveBeenCalled();

    getProductView.mockClear();
    await pageMutates();
    await settle(MAX_WAIT);
    expect(getProductView).not.toHaveBeenCalled();
  });
});

describe('with the real surface', () => {
  it('rendering the badge does not trigger further comparisons (no mutation loop)', async () => {
    const compare = vi.fn(async () => makeShowOutcome());
    controller = createController({
      getProductView: () => currentView,
      compare,
      surface: createBadgeSurface(),
      debounceMs: DEBOUNCE,
      maxWaitMs: MAX_WAIT,
      pageKey: () => currentPage,
    });
    controller.start();
    await settle(0);
    expect(document.getElementById(BADGE_ROOT_ID)).not.toBeNull();

    await settle(MAX_WAIT * 3);

    expect(compare).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll(`#${BADGE_ROOT_ID}`)).toHaveLength(1);
  });

  it('leaves exactly one badge across repeated page churn and a wipe-and-restore of the body', async () => {
    controller = createController({
      getProductView: () => currentView,
      compare: async () => makeShowOutcome(),
      surface: createBadgeSurface(),
      debounceMs: DEBOUNCE,
      maxWaitMs: MAX_WAIT,
      pageKey: () => currentPage,
    });
    controller.start();
    await settle(0);

    document.body.replaceChildren(); // an SPA re-render that drops unknown nodes
    await settle(DEBOUNCE + 50);
    for (let i = 0; i < 4; i += 1) {
      await pageMutates();
      await settle();
    }

    const hosts = document.querySelectorAll(`#${BADGE_ROOT_ID}`);
    expect(hosts).toHaveLength(1);
    expect(hosts[0]?.shadowRoot?.querySelectorAll('.pinkless')).toHaveLength(1);
  });
});
