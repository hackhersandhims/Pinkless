import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTilt } from '../motion/useTilt';
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
  /** Display name of the chosen Kroger store, shown as the scene's store context. */
  storeName?: string;
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
export function HeroComparison({ item, storeName, loading = false }: HeroComparisonProps) {
  const link = useStoreLink();
  const tiltRef = useRef<HTMLAnchorElement>(null);
  useTilt(tiltRef);

  if (!item) {
    return (
      <div className={styles.stage} aria-hidden="true">
        <span className={styles.backdrop} />
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
      ref={tiltRef}
      to={link(`/compare/${item.id}`)}
      className={styles.stage}
      aria-label={`Featured comparison: ${comparisonSummary(item)}`}
    >
      <span className={styles.backdrop} aria-hidden="true" />

      {storeName ? (
        <span className={`caption ${styles.storeChip}`}>
          <span className="label">Your Kroger</span>
          <span className={styles.storeName}>{storeName}</span>
        </span>
      ) : null}

      <div className={`${styles.card} ${styles.back}`}>
        <ProductMedia
          category={item.category}
          size="thumb"
          resolution="large"
          image={{ krogerProductId: womens.krogerProductId, alt: womens.name }}
        />
        <span className="label">{womens.marketedToLabel}</span>
        <span className={`caption ${styles.name}`}>{womens.name}</span>
        <span className={`display ${styles.priceSm}`}>{formatCents(womens.priceCents)}</span>
      </div>

      <div className={`${styles.card} ${styles.front}`}>
        <div className={styles.savings}>
          <SavingsBadge cents={item.savingsCents} />
          {item.percentLower !== undefined ? (
            <span className="caption">{item.percentLower}% lower</span>
          ) : null}
        </div>
        <ProductMedia
          category={item.category}
          size="hero"
          resolution="large"
          image={{ krogerProductId: other.krogerProductId, alt: other.name }}
        />
        <div className={styles.frontBody}>
          <span className="label">{other.marketedToLabel}</span>
          <span className={`body ${styles.name}`}>{other.name}</span>
          <span className={`display ${styles.price}`}>{formatCents(other.priceCents)}</span>
          <span className="caption">{freshnessLine(item)}</span>
        </div>
      </div>
    </Link>
  );
}
