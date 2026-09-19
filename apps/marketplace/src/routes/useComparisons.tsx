import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadComparisons } from '../lib/api.js';
import { getActiveComparisons } from '../lib/catalog.js';
import type { ComparisonView } from '../lib/types.js';

export type ComparisonsState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: ComparisonView[] };

type ComparisonsContextValue = {
  state: ComparisonsState;
  /** Discards the current state and loads the feed again. */
  reload: () => void;
};

const ComparisonsContext = createContext<ComparisonsContextValue | null>(null);

/**
 * Loads the comparison feed once for the whole app. The header nav, hero
 * stats, and every page read from the same load, so moving between routes
 * neither refetches nor flashes a loading state.
 */
export function ComparisonsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ComparisonsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadComparisons()
      .then((response) => {
        if (cancelled) return;
        setState({ status: 'ready', items: getActiveComparisons(response) });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Shoppers get a plain-language message; the cause stays in dev tools.
        if (import.meta.env.DEV) console.error('[pinkless] failed to load comparisons', error);
        setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  const value = useMemo(() => ({ state, reload }), [state, reload]);
  return <ComparisonsContext.Provider value={value}>{children}</ComparisonsContext.Provider>;
}

export function useComparisons(): ComparisonsContextValue {
  const value = useContext(ComparisonsContext);
  if (!value) throw new Error('useComparisons must be used inside <ComparisonsProvider>.');
  return value;
}
