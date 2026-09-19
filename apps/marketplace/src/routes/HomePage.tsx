import { groupByCategory, sortComparisons, summarizeFeed } from '../lib/catalog.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import {
  CategoryTiles,
  EmptyState,
  ErrorState,
  Hero,
  HowItWorks,
  LoadingCards,
  ProductRail,
  StatStrip,
} from '../components/index.js';
import { useComparisons } from './useComparisons.js';
import styles from './HomePage.module.css';

/**
 * Home rhythm: hero, stat strip, category tiles, a tinted "Biggest savings"
 * band, the plum "how it works" panel, footer. "Biggest savings" is computed
 * from the feed (largest integer-cent saving first); there is no popularity
 * data to rank by, so nothing here claims one.
 */
export function HomePage() {
  const { state, reload } = useComparisons();
  useDocumentTitle();

  const items = state.status === 'ready' ? state.items : [];
  const bySavings = sortComparisons(items, 'savings');
  const groups = groupByCategory(items);

  return (
    <>
      <Hero featured={bySavings[0]} loading={state.status === 'loading'} />

      {items.length > 0 ? <StatStrip summary={summarizeFeed(items)} /> : null}

      {groups.length > 0 ? <CategoryTiles groups={groups} /> : null}

      <div id="biggest-savings" className={styles.band}>
        <div className="container">
          {state.status === 'loading' && <LoadingCards />}
          {state.status === 'error' && <ErrorState onRetry={reload} />}
          {state.status === 'ready' && items.length === 0 && (
            <EmptyState
              title="No active comparisons"
              body="We haven't published a verified comparison yet. Check back soon."
            />
          )}
          {items.length > 0 && (
            <ProductRail
              id="savings-rail"
              eyebrow="Compare and save"
              title="Biggest savings"
              description="Every verified comparison, largest saving first."
              items={bySavings}
              seeAll={{ to: '/search', label: 'View all' }}
            />
          )}
        </div>
      </div>

      <HowItWorks />
    </>
  );
}
