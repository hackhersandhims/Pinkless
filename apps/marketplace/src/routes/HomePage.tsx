import { groupByCategory, sortComparisons, storeLabel, summarizeFeed } from '../lib/catalog.js';
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
import { useStoreLink } from './useStore.js';
import styles from './HomePage.module.css';

/**
 * Home rhythm: hero (store picker until a store is chosen), stat strip,
 * category tiles, a tinted "Biggest differences" band, the plum "how it
 * works" panel, footer. Order is computed from the feed (largest integer-cent
 * difference first); there is no popularity data, so nothing here claims one.
 */
export function HomePage() {
  const { state, store, reload } = useComparisons();
  const link = useStoreLink();
  useDocumentTitle(store ? storeLabel(store) : undefined);

  const items = state.status === 'ready' ? state.items : [];
  const bySavings = sortComparisons(items, 'savings');
  const groups = groupByCategory(items);

  return (
    <>
      <Hero store={store} featured={bySavings[0]} loading={state.status === 'loading'} />

      {store && items.length > 0 ? <StatStrip summary={summarizeFeed(items)} store={store} /> : null}

      {groups.length > 0 ? <CategoryTiles groups={groups} /> : null}

      {store ? (
        <div id="biggest-savings" className={styles.band}>
          <div className="container">
            {state.status === 'loading' && <LoadingCards />}
            {state.status === 'error' && <ErrorState onRetry={reload} />}
            {state.status === 'ready' && items.length === 0 && (
              <EmptyState
                title="No comparisons at this store right now"
                body={`None of our reviewed pairs is cheaper in the men’s or neutral version at ${storeLabel(store)} today, or Kroger didn’t return both prices. Try another store.`}
              />
            )}
            {items.length > 0 && (
              <ProductRail
                id="savings-rail"
                eyebrow={storeLabel(store)}
                title="Biggest differences"
                description="Every reviewed pair where the men’s or neutral version costs less here, largest difference first."
                items={bySavings}
                seeAll={{ to: link('/search'), label: 'View all' }}
              />
            )}
          </div>
        </div>
      ) : null}

      <HowItWorks />
    </>
  );
}
