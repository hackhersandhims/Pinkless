import { Link } from 'react-router-dom';
import type { ComparisonView, ProductSide } from '../lib/types';
import { formatCents } from '../lib/money';
import { comparisonHeadline, comparisonSummary, freshnessLine } from '../lib/copy';
import { useStoreLink } from '../routes/useStore';
import { ArrowRightIcon } from './icons';
import { ProductMedia } from './ProductMedia';
import { SavingsBadge } from './SavingsBadge';
import styles from './ComparisonCard.module.css';

export type ComparisonCardProps = {
  item: ComparisonView;
};

function SideRow({ side, emphasis }: { side: ProductSide; emphasis?: boolean }) {
  return (
    <div className={`${styles.side} ${emphasis ? styles.sideEmphasis : ''}`}>
      <span className={`label ${styles.marketed}`}>{side.marketedToLabel}</span>
      <span className={`caption ${styles.sideName}`}>{side.name}</span>
      <span className={`heading ${styles.sidePrice}`}>{formatCents(side.priceCents)}</span>
    </div>
  );
}

/**
 * The one comparison card, used in rails and grids. The whole card is a
 * single link to /compare/:id (no nested controls). It always shows both
 * products and both prices, the store, the price context, and the date the
 * prices were checked; the cheaper men's or neutral version is emphasized.
 */
export function ComparisonCard({ item }: ComparisonCardProps) {
  const link = useStoreLink();
  const [firstDifference] = item.knownDifferences;

  return (
    <Link
      to={link(`/compare/${item.id}`)}
      className={styles.card}
      aria-label={comparisonSummary(item)}
    >
      <div className={styles.media}>
        <ProductMedia
          category={item.category}
          size="thumb"
          image={{ krogerProductId: item.womens.krogerProductId, alt: item.womens.name }}
        />
        <ProductMedia
          category={item.category}
          size="thumb"
          image={{ krogerProductId: item.other.krogerProductId, alt: item.other.name }}
        />
      </div>

      <div className={styles.body}>
        <span className={`label ${styles.category}`}>{item.categoryLabel}</span>
        <h3 className={`heading ${styles.headline}`}>{comparisonHeadline(item)}</h3>
        <div className={styles.savings}>
          <SavingsBadge cents={item.savingsCents} />
          {item.percentLower !== undefined ? (
            <span className="caption">{item.percentLower}% lower</span>
          ) : null}
        </div>

        <div className={styles.sides}>
          <SideRow side={item.womens} />
          <SideRow side={item.other} emphasis />
        </div>

        {firstDifference ? (
          <p className={`caption ${styles.difference}`}>
            <span className={styles.differenceLabel}>Differs:</span> {firstDifference}
          </p>
        ) : null}
      </div>

      <div className={styles.footer}>
        <span className={`caption ${styles.fresh}`}>{freshnessLine(item)}</span>
        <span className={`label ${styles.action}`}>
          View comparison
          <ArrowRightIcon className={styles.arrow} />
        </span>
      </div>
    </Link>
  );
}
