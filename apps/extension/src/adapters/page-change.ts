export const PAGE_CHANGE_DEBOUNCE_MS = 250;

/**
 * Coalesces DOM churn from a variant selection or SPA navigation into one
 * extraction pass. Phase 4 owns the callback that clears/re-renders the badge.
 */
export function observePageChanges(
  document: Document,
  onChange: () => void,
  debounceMs = PAGE_CHANGE_DEBOUNCE_MS,
): () => void {
  const view = document.defaultView;
  if (!view || !document.documentElement) return () => undefined;

  let timer: number | undefined;
  const schedule = () => {
    if (timer !== undefined) view.clearTimeout(timer);
    timer = view.setTimeout(onChange, debounceMs);
  };
  const observer = new view.MutationObserver(schedule);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
  });
  view.addEventListener('popstate', schedule);
  view.addEventListener('hashchange', schedule);

  return () => {
    observer.disconnect();
    view.removeEventListener('popstate', schedule);
    view.removeEventListener('hashchange', schedule);
    if (timer !== undefined) view.clearTimeout(timer);
  };
}
