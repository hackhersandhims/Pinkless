import { Link, useParams } from 'react-router-dom';
import { getComparison } from '../lib/catalog.js';
import { comparisonHeadline } from '../lib/copy.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import {
  ComparisonDetail,
  EmptyState,
  ErrorState,
  LoadingCards,
  PageContainer,
  StoreRequired,
} from '../components/index.js';
import buttons from '../components/Button.module.css';
import { useComparisons } from './useComparisons.js';
import { NotFoundPage } from './NotFoundPage.js';
import { useStoreLink } from './useStore.js';

export function ComparePage() {
  const { id } = useParams<{ id: string }>();
  const { state, reload } = useComparisons();
  const link = useStoreLink();
  const comparison = id && state.status === 'ready' ? getComparison(state.items, id) : undefined;
  useDocumentTitle(comparison ? comparisonHeadline(comparison) : undefined);

  if (!id) {
    return <NotFoundPage />;
  }

  if (state.status === 'no-store') {
    return (
      <PageContainer>
        <StoreRequired />
      </PageContainer>
    );
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
          body="This pair isn’t cheaper in the men’s or neutral version at this store right now, or Kroger didn’t return both prices. Browse the comparisons for this store instead."
        >
          <Link to={link('/search')} className={`body ${buttons.button} ${buttons.dark}`}>
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
