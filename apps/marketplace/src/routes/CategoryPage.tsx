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
} from '../components/index.js';
import buttons from '../components/Button.module.css';
import { useComparisons } from './useComparisons.js';
import { NotFoundPage } from './NotFoundPage.js';

function isCategorySlug(value: string | undefined): value is CategorySlug {
  return CATEGORY_ORDER.includes(value as CategorySlug);
}

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { state, reload } = useComparisons();
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
        description={`Verified price comparisons for ${CATEGORY_LABELS[slug].toLowerCase()}.`}
      />

      {state.status === 'loading' && <LoadingCards />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'ready' &&
        (group ? (
          <ResultsList items={group.items} />
        ) : (
          <EmptyState
            title="No comparisons yet"
            body={`We haven't reviewed a verified comparison in ${CATEGORY_LABELS[slug].toLowerCase()} yet.`}
          >
            <Link to="/search" className={`body ${buttons.button} ${buttons.dark}`}>
              Browse all comparisons
            </Link>
          </EmptyState>
        ))}
    </PageContainer>
  );
}
