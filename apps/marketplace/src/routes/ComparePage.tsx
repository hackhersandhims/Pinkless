import { Link, useParams } from 'react-router-dom';
import { getComparison } from '../lib/catalog.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import {
  ComparisonDetail,
  EmptyState,
  ErrorState,
  LoadingCards,
  PageContainer,
} from '../components/index.js';
import buttons from '../components/Button.module.css';
import { useComparisons } from './useComparisons.js';
import { NotFoundPage } from './NotFoundPage.js';

export function ComparePage() {
  const { id } = useParams<{ id: string }>();
  const { state, reload } = useComparisons();
  const comparison = id && state.status === 'ready' ? getComparison(state.items, id) : undefined;
  useDocumentTitle(comparison?.name);

  if (!id) {
    return <NotFoundPage />;
  }

  if (state.status === 'loading') {
    return (
      <PageContainer>
        <LoadingCards count={1} />
      </PageContainer>
    );
  }
  if (state.status === 'error') {
    return (
      <PageContainer>
        <ErrorState onRetry={reload} />
      </PageContainer>
    );
  }

  if (!comparison) {
    return (
      <PageContainer>
        <EmptyState
          title="Comparison not available"
          body="This comparison is no longer active. Browse the Marketplace for current comparisons."
        >
          <Link to="/search" className={`body ${buttons.button} ${buttons.dark}`}>
            Browse all comparisons
          </Link>
        </EmptyState>
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      <ComparisonDetail item={comparison} />
    </PageContainer>
  );
}
