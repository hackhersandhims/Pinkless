import { useId, useState } from 'react';
import { SORT_LABELS, sortComparisons } from '../lib/catalog';
import type { SortKey } from '../lib/catalog';
import type { ComparisonView } from '../lib/types';
import { ProductGrid } from './ProductGrid';
import styles from './ResultsList.module.css';

export type ResultsListProps = {
  items: ComparisonView[];
};

/** Sort control plus the card grid, for category and search pages. */
export function ResultsList({ items }: ResultsListProps) {
  const uid = useId();
  const [sort, setSort] = useState<SortKey>('savings');
  const visible = sortComparisons(items, sort);

  return (
    <section aria-labelledby={`${uid}-results`}>
      <h2 id={`${uid}-results`} className="visually-hidden">
        Comparisons
      </h2>
      <div className={styles.toolbar}>
        <p role="status" className={`caption ${styles.count}`}>
          {items.length} {items.length === 1 ? 'comparison' : 'comparisons'}
        </p>
        <div className={styles.controls}>
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

      <ProductGrid items={visible} />
    </section>
  );
}
