import { Link } from 'react-router-dom';
import type { ComparisonView } from '../lib/types';
import { formatCents, formatSavings } from '../lib/money';
import { formatObservedAt } from '../lib/dates';
import styles from './ComparisonCard.module.css';

export type ComparisonCardProps = {
  item: ComparisonView;
};

/**
 * Card for one comparison: the same packaged product at two retailers, with
 * the cheaper (alternative) offer and the savings. Links to /compare/:id.
 */
export function ComparisonCard({ item }: ComparisonCardProps) {
  const savingsLabel = formatSavings(item.savingsCents);

  return (
    <Link
      to={`/compare/${item.id}`}
      className={styles.card}
      aria-label={`${item.name}: ${savingsLabel} at ${item.alternative.retailerLabel} versus ${item.reference.retailerLabel}`}
    >
      <span className={`label ${styles.category}`}>{item.categoryLabel}</span>
      <h3 className={`heading ${styles.name}`}>{item.name}</h3>
      <span className={`caption ${styles.meta}`}>
        {item.brand ? `${item.brand} · ` : ''}
        {item.variant}
      </span>

      <div className={styles.offers}>
        <div className={styles.offerRow}>
          <span className={`body ${styles.offerLabel}`}>{item.reference.retailerLabel}</span>
          <span className="body">{formatCents(item.reference.priceCents)}</span>
        </div>
        <div className={styles.offerRow}>
          <span className={`body ${styles.offerLabel}`}>{item.alternative.retailerLabel}</span>
          <span className="body">{formatCents(item.alternative.priceCents)}</span>
        </div>
      </div>

      <p className={`heading ${styles.savings}`}>{savingsLabel}</p>

      <span className={`caption ${styles.footNote}`}>
        {item.alternative.priceContextLabel} price · {formatObservedAt(item.alternative.observedAt)}
      </span>
    </Link>
  );
}
