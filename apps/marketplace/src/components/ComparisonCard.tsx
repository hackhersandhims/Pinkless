import { Link } from 'react-router-dom';
import type { ComparisonView } from '../lib/types';
import { formatCents, formatSavings, percentLower } from '../lib/money';
import { formatObservedAt } from '../lib/dates';
import { ArrowRightIcon } from './icons';
import { ProductMedia } from './ProductMedia';
import { SavingsBadge } from './SavingsBadge';
import styles from './ComparisonCard.module.css';

export type ComparisonCardProps = {
  item: ComparisonView;
};

/** Same-retailer women-to-men comparison card. The whole card is one link. */
export function ComparisonCard({ item }: ComparisonCardProps) {
  const { reference, alternative } = item;
  const percent = percentLower(item.savingsCents, reference.priceCents);

  return (
    <Link
      to={`/compare/${item.id}`}
      className={styles.card}
      aria-label={`${item.alternativeName}: ${formatCents(alternative.priceCents)} at ${reference.retailerLabel}. ${formatSavings(item.savingsCents)} versus ${item.name}`}
    >
      <ProductMedia category={item.category} />

      <div className={styles.body}>
        <span className={`label ${styles.category}`}>{item.categoryLabel}</span>
        <h3 className={`body ${styles.name}`}>{item.alternativeName}</h3>
        <span className="caption">{item.alternativeVariant}</span>

        <div className={styles.pricing}>
          <p className={`display ${styles.price}`}>{formatCents(alternative.priceCents)}</p>
          <span className="caption">
            at <span className={styles.retailer}>{alternative.retailerLabel}</span>
          </span>
        </div>
        <span className="caption">
          Compared with {item.name} at {formatCents(reference.priceCents)}
        </span>

        <div className={styles.savings}>
          <SavingsBadge cents={item.savingsCents} />
          {percent !== undefined ? <span className="caption">{percent}% lower</span> : null}
        </div>
      </div>

      <div className={styles.footer}>
        <span className={`caption ${styles.fresh}`}>
          {alternative.priceContextLabel} · {formatObservedAt(alternative.observedAt)}
        </span>
        <span className={`label ${styles.action}`}>
          View comparison
          <ArrowRightIcon className={styles.arrow} />
        </span>
      </div>
    </Link>
  );
}
