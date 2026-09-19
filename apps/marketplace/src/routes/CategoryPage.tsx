import { Link, useParams } from 'react-router-dom';
import { groupByCategory } from '../lib/catalog.js';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/types.js';
import type { CategorySlug } from '../lib/types.js';
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
import { NotFoundPage } from './NotFoundPage.js';
import { useStoreLink } from './useStore.js';

function isCategorySlug(value: string | undefined): value is CategorySlug {
  return CATEGORY_ORDER.includes(value as CategorySlug);
}

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { state, reload } = useComparisons();
  const link = useStoreLink();
  const label = isCategorySlug(slug) ? CATEGORY_LABELS[slug] : undefined;
  useDocumentTitle(label);

  if (!isCategorySlug(slug)) {
    return <NotFoundPage />;
  }

  const group =
    state.status === 'ready'
      ? groupByCategory(state.items).find((candidate) => candidate.slug === slug)
      : undefined;

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Category"
        title={CATEGORY_LABELS[slug]}
        description={`Reviewed ${CATEGORY_LABELS[slug].toLowerCase()} pairs where the men’s or neutral version costs less at this store.`}
      />

      {state.status === 'no-store' && <StoreRequired />}
      {state.status === 'loading' && <LoadingCards />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'ready' &&
        (group ? (
          <ResultsList items={group.items} />
        ) : (
          <EmptyState
            title="No comparisons here at this store"
            body={`None of our reviewed ${CATEGORY_LABELS[slug].toLowerCase()} pairs is cheaper in the men’s or neutral version at this store right now.`}
          >
            <Link to={link('/search')} className={`body ${buttons.button} ${buttons.dark}`}>
              Browse all comparisons
            </Link>
          </EmptyState>
        ))}
    </PageContainer>
  );
}
