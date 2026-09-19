export const PAGE_CHANGE_DEBOUNCE_MS = 250;

/**
 * Coalesces DOM churn from a variant selection or SPA navigation into one
 * extraction pass. Phase 4 owns the callback that clears/re-renders the badge.
 */
export function observePageChanges(
  document: Document,
  onChange: () => void,
  debounceMs = PAGE_CHANGE_DEBOUNCE_MS,
  ignoredRootId?: string,
): () => void {
  const view = document.defaultView;
  if (!view || !document.documentElement) return () => undefined;

  let timer: number | undefined;
  let observedHref = view.location.href;
  const schedule = () => {
    if (timer !== undefined) view.clearTimeout(timer);
    timer = view.setTimeout(onChange, debounceMs);
  };
  const observer = new view.MutationObserver((records) => {
    const ignoredRoot = ignoredRootId ? document.getElementById(ignoredRootId) : null;
    const onlyIgnoredChanges =
      ignoredRoot &&
      records.every((record) => {
        if (record.target === ignoredRoot || ignoredRoot.contains(record.target)) return true;
        const changedNodes = [...record.addedNodes, ...record.removedNodes];
        return (
          changedNodes.length > 0 &&
          changedNodes.every((node) => node === ignoredRoot || ignoredRoot.contains(node))
        );
      });
    if (!onlyIgnoredChanges) schedule();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
  });
  view.addEventListener('popstate', schedule);
  view.addEventListener('hashchange', schedule);
  const navigationCheck = view.setInterval(() => {
    if (view.location.href === observedHref) return;
    observedHref = view.location.href;
    schedule();
  }, debounceMs);

  return () => {
    observer.disconnect();
    view.removeEventListener('popstate', schedule);
    view.removeEventListener('hashchange', schedule);
    view.clearInterval(navigationCheck);
    if (timer !== undefined) view.clearTimeout(timer);
  };
}
