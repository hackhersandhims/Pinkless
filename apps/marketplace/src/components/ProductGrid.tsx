import type { ComparisonView } from '../lib/types';
import { ComparisonCard } from './ComparisonCard';
import styles from './ProductGrid.module.css';

export type ProductGridProps = {
  items: ComparisonView[];
};

/** Wrapping grid of product cards for category and search results. */
export function ProductGrid({ items }: ProductGridProps) {
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li key={item.id}>
          <ComparisonCard item={item} />
        </li>
      ))}
    </ul>
  );
}
