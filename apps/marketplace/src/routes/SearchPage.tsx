import { useSearchParams, Link } from 'react-router-dom';
import { groupByCategory, searchComparisons, storeLabel } from '../lib/catalog.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import {
  EmptyState,
  ErrorState,
  LoadingCards,
  PageContainer,
  PageHeading,
  ResultsList,
  StoreRequired,
} from '../components/index.js';
import buttons from '../components/Button.module.css';
import { useComparisons } from './useComparisons.js';
import { useStoreLink } from './useStore.js';

/**
 * /search?q=… filters the loaded comparisons; with no query it lists all of
 * them, so it doubles as the "All comparisons" page.
 */
export function SearchPage() {
  const { state, store, reload } = useComparisons();
  const link = useStoreLink();
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  useDocumentTitle(query ? `Search: ${query}` : 'All comparisons');

  const results = state.status === 'ready' ? searchComparisons(state.items, query) : [];
  const groups = state.status === 'ready' ? groupByCategory(state.items) : [];

  return (
    <PageContainer>
      <PageHeading
        eyebrow={store ? storeLabel(store) : query ? 'Search' : 'Browse'}
        title={query ? `Results for “${query}”` : 'All comparisons'}
        description={
          query
            ? undefined
            : 'Every reviewed pair where the men’s or neutral version costs less at this store, biggest difference first.'
        }
      />

      {state.status === 'no-store' && <StoreRequired />}
      {state.status === 'loading' && <LoadingCards />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'ready' &&
        (results.length === 0 ? (
          <EmptyState
            title={
              query ? `No comparisons match “${query}”` : 'No comparisons at this store right now'
            }
            body={
              query
                ? 'Try a shorter or different word, or browse by category.'
                : 'None of our reviewed pairs is cheaper in the men’s or neutral version at this store today. Try another store.'
            }
          >
            {query && (
              <Link to={link('/search')} className={`body ${buttons.button} ${buttons.dark}`}>
                Show all comparisons
              </Link>
            )}
            {query &&
              groups.map((group) => (
                <Link
                  key={group.slug}
                  to={link(`/category/${group.slug}`)}
                  className={`body ${buttons.button} ${buttons.outline}`}
                >
                  {group.label}
                </Link>
              ))}
          </EmptyState>
        ) : (
          <ResultsList items={results} />
        ))}
    </PageContainer>
  );
}
