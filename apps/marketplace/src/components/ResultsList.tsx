import { useId, useState } from 'react';
import { alternativeRetailers, SORT_LABELS, sortComparisons } from '../lib/catalog';
import type { SortKey } from '../lib/catalog';
import { RETAILER_LABELS } from '../lib/types';
import type { ComparisonView, Retailer } from '../lib/types';
import { EmptyState } from './EmptyState';
import { ProductGrid } from './ProductGrid';
import buttons from './Button.module.css';
import styles from './ResultsList.module.css';

export type ResultsListProps = {
  items: ComparisonView[];
};

type RetailerFilter = Retailer | 'all';

/**
 * Sort and filter controls plus the card grid, for category and search pages.
 * Both controls act on the items passed in: "Sort by" reorders them and
 * "Cheaper at" narrows to comparisons whose lower price is at one retailer.
 * The retailer filter only appears when there is more than one to choose from.
 */
export function ResultsList({ items }: ResultsListProps) {
  const uid = useId();
  const [sort, setSort] = useState<SortKey>('savings');
  const [retailer, setRetailer] = useState<RetailerFilter>('all');

  const retailers = alternativeRetailers(items);
  // A stale selection (the search changed underneath it) falls back to "all".
  const activeRetailer: RetailerFilter = retailers.includes(retailer as Retailer)
    ? retailer
    : 'all';
  const visible = sortComparisons(
    activeRetailer === 'all'
      ? items
      : items.filter((item) => item.alternative.retailer === activeRetailer),
    sort,
  );

  return (
    <section aria-labelledby={`${uid}-results`}>
      <h2 id={`${uid}-results`} className="visually-hidden">
        Comparisons
      </h2>
      <div className={styles.toolbar}>
        <p role="status" className={`caption ${styles.count}`}>
          {visible.length === items.length
            ? `${items.length} ${items.length === 1 ? 'comparison' : 'comparisons'}`
            : `${visible.length} of ${items.length} comparisons`}
        </p>
        <div className={styles.controls}>
          {retailers.length > 1 ? (
            <div className={styles.field}>
              <label htmlFor={`${uid}-retailer`} className="label">
                Cheaper at
              </label>
              <select
                id={`${uid}-retailer`}
                className={`body ${styles.select}`}
                value={activeRetailer}
                onChange={(event) => setRetailer(event.target.value as RetailerFilter)}
              >
                <option value="all">All retailers</option>
                {retailers.map((value) => (
                  <option key={value} value={value}>
                    {RETAILER_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className={styles.field}>
            <label htmlFor={`${uid}-sort`} className="label">
              Sort by
            </label>
            <select
              id={`${uid}-sort`}
              className={`body ${styles.select}`}
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No comparisons at that retailer"
          body="Nothing here is cheaper at the retailer you picked. Show all retailers to see every comparison."
        >
          <button
            type="button"
            className={`body ${buttons.button} ${buttons.outline}`}
            onClick={() => setRetailer('all')}
          >
            Show all retailers
          </button>
        </EmptyState>
      ) : (
        <ProductGrid items={visible} />
      )}
    </section>
  );
}
