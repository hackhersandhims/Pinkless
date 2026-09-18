import { useParams } from 'react-router-dom';
import { groupByCategory } from '../lib/catalog.js';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/types.js';
import type { CategorySlug } from '../lib/types.js';
import { useComparisons } from './useComparisons.js';
import { CategorySection, EmptyState, PageShell, SiteFooter, SiteHeader } from '../components/index.js';
import { NotFoundPage } from './NotFoundPage.js';

function isCategorySlug(value: string | undefined): value is CategorySlug {
  return CATEGORY_ORDER.includes(value as CategorySlug);
}

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = useComparisons();

  if (!isCategorySlug(slug)) {
    return <NotFoundPage />;
  }

  return (
    <>
      <SiteHeader />
      <PageShell>
        {/* The category name is this page's single <h1>; CategorySection renders <h2>. */}
        <h1 className="display">{CATEGORY_LABELS[slug]}</h1>
        {state.status === 'loading' && <p className="body">Loading comparisons…</p>}
        {state.status === 'error' && <p className="body">{state.message}</p>}
        {state.status === 'ready' &&
          (() => {
            const group = groupByCategory(state.items).find((candidate) => candidate.slug === slug);
            if (!group) {
              return (
                <EmptyState
                  title="No comparisons yet"
                  body={`We haven't reviewed a verified comparison in ${CATEGORY_LABELS[slug].toLowerCase()} yet.`}
                />
              );
            }
            return <CategorySection group={group} />;
          })()}
      </PageShell>
      <SiteFooter />
    </>
  );
}
