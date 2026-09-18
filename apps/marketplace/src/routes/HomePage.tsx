import { groupByCategory } from '../lib/catalog.js';
import { useComparisons } from './useComparisons.js';
import { CategorySection, EmptyState, Hero, PageShell, SiteFooter, SiteHeader } from '../components/index.js';

export function HomePage() {
  const state = useComparisons();

  return (
    <>
      <SiteHeader />
      <Hero />
      <PageShell>
        {state.status === 'loading' && <p className="body">Loading comparisons…</p>}
        {state.status === 'error' && <p className="body">{state.message}</p>}
        {state.status === 'ready' &&
          (() => {
            const groups = groupByCategory(state.items);
            if (groups.length === 0) {
              return (
                <EmptyState
                  title="No active comparisons"
                  body="We haven't published a verified comparison yet. Check back soon."
                />
              );
            }
            return groups.map((group) => <CategorySection key={group.slug} group={group} />);
          })()}
      </PageShell>
      <SiteFooter />
    </>
  );
}
