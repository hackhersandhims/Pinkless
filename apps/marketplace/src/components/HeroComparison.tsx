import { Link } from 'react-router-dom';
import type { ComparisonView } from '../lib/types';
import { formatCents, formatSavings, percentLower } from '../lib/money';
import { CATEGORY_ICONS } from './icons';
import { ProductMedia } from './ProductMedia';
import { SavingsBadge } from './SavingsBadge';
import styles from './HeroComparison.module.css';

export type HeroComparisonProps = {
  item?: ComparisonView;
  loading?: boolean;
};

const FALLBACK_CATEGORIES = ['razors', 'deodorant', 'body-wash'] as const;

/**
 * The hero's visual: one real comparison drawn as two overlapping cards (the
 * higher price behind, the lower price in front) on the pink stage. It shows
 * exactly what the comparison page shows, so nothing here is illustrative.
 * While loading it holds the same shape; with no data it shows category
 * marks instead of an empty pink block.
 */
export function HeroComparison({ item, loading = false }: HeroComparisonProps) {
  if (!item) {
    return (
      <div className={styles.stage} aria-hidden="true">
        {loading ? (
          <>
            <div className={`${styles.card} ${styles.back} ${styles.ghost}`} />
            <div className={`${styles.card} ${styles.front} ${styles.ghost}`} />
          </>
        ) : (
          <div className={styles.marks}>
            {FALLBACK_CATEGORIES.map((slug) => {
              const CategoryIcon = CATEGORY_ICONS[slug];
              return (
                <span key={slug} className={styles.mark}>
                  <CategoryIcon className={styles.markIcon} />
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const { reference, alternative } = item;
  const percent = percentLower(item.savingsCents, reference.priceCents);

  return (
    <Link
      to={`/compare/${item.id}`}
      className={styles.stage}
      aria-label={`Featured comparison: ${item.name}. ${formatSavings(item.savingsCents)} at ${alternative.retailerLabel} versus ${reference.retailerLabel}`}
    >
      <div className={`${styles.card} ${styles.back}`}>
        <span className="label">Higher price</span>
        <span className={`heading ${styles.retailer}`}>{reference.retailerLabel}</span>
        <span className={`display ${styles.priceSm}`}>{formatCents(reference.priceCents)}</span>
        <span className="caption">{reference.priceContextLabel} price</span>
      </div>

      <div className={`${styles.card} ${styles.front}`}>
        <ProductMedia category={item.category} />
        <div className={styles.frontBody}>
          <span className="label">{item.categoryLabel}</span>
          <span className={`body ${styles.name}`}>{item.name}</span>
          <span className="caption">Lower price at {alternative.retailerLabel}</span>
          <span className={`display ${styles.price}`}>{formatCents(alternative.priceCents)}</span>
        </div>
      </div>

      <div className={styles.savings}>
        <SavingsBadge cents={item.savingsCents} />
        {percent !== undefined ? <span className="caption">{percent}% lower</span> : null}
      </div>
    </Link>
  );
}
