import { Link } from 'react-router-dom';
import type { ComparisonView } from '../lib/types';
import { formatCents } from '../lib/money';
import { comparisonSummary, freshnessLine } from '../lib/copy';
import { useStoreLink } from '../routes/useStore';
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
 * women's product behind, the cheaper men's or neutral version in front) on
 * the pink stage. It shows exactly what the comparison page shows, so nothing
 * here is illustrative. While loading it holds the same shape; with no data
 * it shows category marks instead of an empty pink block.
 */
export function HeroComparison({ item, loading = false }: HeroComparisonProps) {
  const link = useStoreLink();

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

  const { womens, other } = item;

  return (
    <Link
      to={link(`/compare/${item.id}`)}
      className={styles.stage}
      aria-label={`Featured comparison: ${comparisonSummary(item)}`}
    >
      <div className={`${styles.card} ${styles.back}`}>
        <span className="label">{womens.marketedToLabel}</span>
        <span className={`caption ${styles.name}`}>{womens.name}</span>
        <span className={`display ${styles.priceSm}`}>{formatCents(womens.priceCents)}</span>
      </div>

      <div className={`${styles.card} ${styles.front}`}>
        <ProductMedia
          category={item.category}
          image={{ krogerProductId: other.krogerProductId, alt: other.name }}
        />
        <div className={styles.frontBody}>
          <span className="label">{other.marketedToLabel}</span>
          <span className={`body ${styles.name}`}>{other.name}</span>
          <span className={`display ${styles.price}`}>{formatCents(other.priceCents)}</span>
          <span className="caption">{freshnessLine(item)}</span>
        </div>
      </div>

      <div className={styles.savings}>
        <SavingsBadge cents={item.savingsCents} />
        {item.percentLower !== undefined ? (
          <span className="caption">{item.percentLower}% lower</span>
        ) : null}
      </div>
    </Link>
  );
}
