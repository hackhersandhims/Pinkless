import type { ComparisonOutcome, ProductView } from '../shared/types.js';
import { toBadgeModel, type BadgeModel } from './badge/model.js';
import { diagnostic } from './diagnostics.js';
import type { BadgeSurface } from './surface.js';

export type ControllerDeps = {
  /** Extracts the current page's product identity, or null when the page is not a supported product. */
  getProductView: () => ProductView | null;
  /** Asks the Pinkless API for a comparison. May reject; a rejection means silence. */
  compare: (view: ProductView) => Promise<ComparisonOutcome>;
  surface: BadgeSurface;
  /** False once the extension was reloaded/removed and this script is orphaned. */
  isContextAlive?: () => boolean;
  now?: () => Date;
  /** Quiet period after the last DOM change before re-evaluating. */
  debounceMs?: number;
  /** Upper bound so constant churn (tickers, carousels) cannot postpone evaluation forever. */
  maxWaitMs?: number;
  /** Identifies "the current page" for the per-page "Not now" dismissal. */
  pageKey?: () => string;
};

export type Controller = {
  start(): void;
  stop(): void;
};

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MAX_WAIT_MS = 1500;
/** After a failed comparison, wait this long before asking again for an unchanged page. */
const ERROR_RETRY_MS = 60_000;
/** setTimeout stores its delay in a signed 32-bit integer. */
const MAX_TIMER_MS = 2 ** 31 - 1;

// Attribute changes that signal a variant/option selection without any text change.
const OBSERVED_ATTRIBUTES = [
  'aria-checked',
  'aria-selected',
  'aria-pressed',
  'checked',
  'selected',
];

/** Everything that can change the comparison. Any difference means "recompute". */
function viewKey(view: ProductView): string {
  return JSON.stringify([
    view.retailer,
    view.canonicalUrl,
    view.productId,
    view.upc,
    view.selectedVariant,
    view.currentPriceCents,
    view.currency,
    view.priceContext,
    view.locationId,
    view.availability,
  ]);
}

/**
 * Decides when to compare and what the surface shows.
 *
 * Invariants (AGENTS.md §2, REQUIREMENTS §6):
 *  - never a stale badge: on any change the old badge is removed before the new answer is known,
 *    and an answer for a superseded page state is discarded;
 *  - a burst of DOM churn is one evaluation (debounced, with a max wait);
 *  - an unchanged page state costs no network call and no DOM write;
 *  - nothing here can throw into the page: every failure is silence.
 */
export function createController(deps: ControllerDeps): Controller {
  const now = deps.now ?? (() => new Date());
  const debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const maxWaitMs = deps.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pageKey = deps.pageKey ?? (() => `${location.origin}${location.pathname}`);

  let running = false;
  let generation = 0; // bumps whenever an in-flight answer stops being valid
  let lastKey: string | null = null;
  let retryAtMs = Infinity; // when an unchanged state must be re-asked anyway
  let shown: { model: BadgeModel; onDismiss: () => void } | null = null;
  let dismissedPage: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let firstScheduledAtMs = 0;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let observer: MutationObserver | undefined;
  const navigationTarget = (globalThis as { navigation?: EventTarget }).navigation;

  function clearShown(): void {
    shown = null;
    clearTimeout(expiryTimer);
    deps.surface.hide();
  }

  function stop(): void {
    if (!running) return;
    running = false;
    generation += 1;
    clearTimeout(debounceTimer);
    clearTimeout(expiryTimer);
    observer?.disconnect();
    window.removeEventListener('popstate', schedule);
    window.removeEventListener('hashchange', schedule);
    navigationTarget?.removeEventListener('navigatesuccess', schedule);
  }

  /** Returns false (after stopping) when this instance must no longer touch the page. */
  function stillOwner(): boolean {
    if (!running) return false;
    if (deps.isContextAlive && !deps.isContextAlive()) {
      // Extension reloaded or removed: remove our badge quietly and go dormant.
      deps.surface.hide();
      stop();
      return false;
    }
    if (deps.surface.isReplaced()) {
      // A newer instance owns the root; leave it alone.
      stop();
      return false;
    }
    return true;
  }

  function showBadge(model: BadgeModel): void {
    const onDismiss = (): void => {
      dismissedPage = pageKey();
      clearShown();
    };
    shown = { model, onDismiss };
    deps.surface.show(model, onDismiss);
    clearTimeout(expiryTimer);
    const untilExpiry = model.expiresAtMs - now().valueOf();
    expiryTimer = setTimeout(
      () => {
        // An expired offer must not stay on screen; ask again (the provider revalidates).
        clearShown();
        lastKey = null;
        schedule();
      },
      Math.min(Math.max(untilExpiry, 0), MAX_TIMER_MS),
    );
  }

  async function evaluate(): Promise<void> {
    if (!stillOwner()) return;

    if (dismissedPage !== null && dismissedPage !== pageKey()) dismissedPage = null;

    let view: ProductView | null = null;
    try {
      view = deps.getProductView();
    } catch (error) {
      diagnostic('page adapter threw; suppressing', error);
    }

    if (!view) {
      generation += 1;
      lastKey = null;
      clearShown();
      return;
    }

    const key = viewKey(view);
    if (key === lastKey && now().valueOf() < retryAtMs) {
      // Same state as before: keep the answer we have. If the page's framework wiped our host
      // (SPAs re-render the body), put the same badge back instead of asking again.
      if (shown && !deps.surface.isVisible()) showBadge(shown.model);
      return;
    }

    lastKey = key;
    retryAtMs = Infinity;
    generation += 1;
    const mine = generation;
    clearShown(); // never leave the previous state's badge up while the new answer is pending

    if (dismissedPage === pageKey()) return;

    let outcome: ComparisonOutcome;
    try {
      outcome = await deps.compare(view);
    } catch (error) {
      diagnostic('comparison failed; staying quiet', error);
      retryAtMs = now().valueOf() + ERROR_RETRY_MS;
      return;
    }

    // The page changed (or we stopped) while waiting: this answer is about a state that is gone.
    if (mine !== generation || !stillOwner()) return;

    const model = toBadgeModel(outcome, now());
    if (model) showBadge(model);
  }

  function run(): void {
    evaluate().catch((error: unknown) => diagnostic('evaluation failed', error));
  }

  function schedule(): void {
    if (!running) return;
    const at = now().valueOf();
    if (debounceTimer === undefined) firstScheduledAtMs = at;
    clearTimeout(debounceTimer);
    const remainingWait = maxWaitMs - (at - firstScheduledAtMs);
    debounceTimer = setTimeout(
      () => {
        debounceTimer = undefined;
        run();
      },
      Math.max(0, Math.min(debounceMs, remainingWait)),
    );
  }

  return {
    start() {
      if (running) return;
      running = true;
      observer = new MutationObserver(schedule);
      observer.observe(document.body ?? document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: OBSERVED_ATTRIBUTES,
      });
      window.addEventListener('popstate', schedule);
      window.addEventListener('hashchange', schedule);
      navigationTarget?.addEventListener('navigatesuccess', schedule);
      run();
    },
    stop,
  };
}
