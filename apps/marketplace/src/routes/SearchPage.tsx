import { useSearchParams, Link } from 'react-router-dom';
import { groupByCategory, searchComparisons } from '../lib/catalog.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import {
  EmptyState,
  ErrorState,
  LoadingCards,
  PageContainer,
  PageHeading,
  ResultsList,
} from '../components/index.js';
import buttons from '../components/Button.module.css';
import { useComparisons } from './useComparisons.js';

/**
 * /search?q=… filters the loaded comparisons; with no query it lists all of
 * them, so it doubles as the "All comparisons" page.
 */
export function SearchPage() {
  const { state, reload } = useComparisons();
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  useDocumentTitle(query ? `Search: ${query}` : 'All comparisons');

  const results = state.status === 'ready' ? searchComparisons(state.items, query) : [];
  const groups = state.status === 'ready' ? groupByCategory(state.items) : [];

  return (
    <PageContainer>
      <PageHeading
        eyebrow={query ? 'Search' : 'Browse'}
        title={query ? `Results for “${query}”` : 'All comparisons'}
        description={
          query
            ? undefined
            : 'Every verified comparison, from the biggest savings down. Search above to narrow it.'
        }
      />

      {state.status === 'loading' && <LoadingCards />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'ready' &&
        (results.length === 0 ? (
          <EmptyState
            title={query ? `No comparisons match “${query}”` : 'No active comparisons'}
            body={
              query
                ? 'Try a shorter or different word, or browse by category.'
                : "We haven't published a verified comparison yet. Check back soon."
            }
          >
            {query && (
              <Link to="/search" className={`body ${buttons.button} ${buttons.dark}`}>
                Show all comparisons
              </Link>
            )}
            {query &&
              groups.map((group) => (
                <Link
                  key={group.slug}
                  to={`/category/${group.slug}`}
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
