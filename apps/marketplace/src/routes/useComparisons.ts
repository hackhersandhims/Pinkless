import { useEffect, useState } from 'react';
import { loadComparisons } from '../lib/api.js';
import { getActiveComparisons } from '../lib/catalog.js';
import type { ComparisonView } from '../lib/types.js';

export type ComparisonsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: ComparisonView[] };

/** Loads and shapes the comparison feed once per mount. Simple loading/error/ready states. */
export function useComparisons(): ComparisonsState {
  const [state, setState] = useState<ComparisonsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadComparisons()
      .then((response) => {
        if (cancelled) return;
        setState({ status: 'ready', items: getActiveComparisons(response) });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load comparisons.';
        setState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
