import type { CategoryGroup } from '../lib/types';
import { ComparisonCard } from './ComparisonCard';
import { EmptyState } from './EmptyState';
import styles from './CategorySection.module.css';

export type CategorySectionProps = {
  group: CategoryGroup;
};

/**
 * One category's comparisons. Renders an <h2> — the page it sits on is
 * responsible for supplying the page's single <h1> so heading order stays
 * correct.
 */
export function CategorySection({ group }: CategorySectionProps) {
  const count = group.items.length;

  return (
    <section className={styles.section} aria-labelledby={`category-${group.slug}`}>
      <div className={styles.headerRow}>
        <h2 id={`category-${group.slug}`} className={`heading ${styles.heading}`}>
          {group.label}
        </h2>
        <span className={`caption ${styles.count}`}>
          {count} {count === 1 ? 'comparison' : 'comparisons'}
        </span>
      </div>
      {count === 0 ? (
        <EmptyState
          title="No comparisons yet"
          body={`We haven't reviewed a verified comparison in ${group.label.toLowerCase()} yet.`}
        />
      ) : (
        <div className={styles.grid}>
          {group.items.map((item) => (
            <ComparisonCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
