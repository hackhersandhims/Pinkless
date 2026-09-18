import { useParams } from 'react-router-dom';
import { getComparison } from '../lib/catalog.js';
import { useComparisons } from './useComparisons.js';
import { ComparisonDetail, EmptyState, PageShell, SiteFooter, SiteHeader } from '../components/index.js';
import { NotFoundPage } from './NotFoundPage.js';

export function ComparePage() {
  const { id } = useParams<{ id: string }>();
  const state = useComparisons();

  if (!id) {
    return <NotFoundPage />;
  }

  return (
    <>
      <SiteHeader />
      <PageShell>
        {state.status === 'loading' && <p className="body">Loading comparison…</p>}
        {state.status === 'error' && <p className="body">{state.message}</p>}
        {state.status === 'ready' &&
          (() => {
            const comparison = getComparison(state.items, id);
            if (!comparison) {
              return (
                <EmptyState
                  title="Comparison not available"
                  body="This comparison is no longer active. Browse the Marketplace for current comparisons."
                />
              );
            }
            return <ComparisonDetail item={comparison} />;
          })()}
      </PageShell>
      <SiteFooter />
    </>
  );
}
