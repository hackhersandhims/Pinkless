import { Link } from 'react-router-dom';
import type { ComparisonView, ProductSide } from '../lib/types';
import { formatCents, formatPerUnit, formatSize } from '../lib/money';
import { comparisonHeadline, comparisonSummary, freshnessLine } from '../lib/copy';
import { useRevealOnce } from '../lib/useRevealOnce';
import { useStoreLink } from '../routes/useStore';
import { ArrowRightIcon } from './icons';
import { ProductPairStage } from './ProductPairStage';
import styles from './ComparisonCard.module.css';

export type ComparisonCardProps = {
  item: ComparisonView;
};

function PriceSide({
  side,
  lower,
  perUnit,
}: {
  side: ProductSide;
  lower?: boolean;
  perUnit: boolean;
}) {
  return (
    <div className={`${styles.side} ${lower ? styles.lower : ''}`}>
      <span className={`label ${styles.marketed}`}>{side.marketedToLabel}</span>
      <span className={`caption ${styles.sideName}`}>{side.name}</span>
      <span className={`caption ${styles.size}`}>
        {formatSize(side.size)}
        {perUnit ? ` · ${formatPerUnit(side.priceCents, side.size)}` : ''}
      </span>
      {/* .display gives family and weight; the price scales down from it by ratio. */}
      <span className={`display ${styles.priceWrap}`}>
        <span className={styles.price}>{formatCents(side.priceCents)}</span>
      </span>
    </div>
  );
}

/**
 * The Pinkless comparison card, used in rails and grids. Reads top to
 * bottom as: both packages on one stage with the saving bridging them, then
 * the women's price → the lower men's or neutral price, then the store and
 * date. The whole card is one link to /compare/:id (no nested controls);
 * its accessible name states both products, both prices, the saving, the
 * store, and the date, so nothing depends on layout or color.
 */
export function ComparisonCard({ item }: ComparisonCardProps) {
  const link = useStoreLink();
  const reveal = useRevealOnce<HTMLDivElement>();
  const [firstDifference] = item.knownDifferences;

  return (
    <div ref={reveal} className={styles.reveal}>
      <Link
        to={link(`/compare/${item.id}`)}
        className={styles.card}
        aria-label={comparisonSummary(item)}
      >
        <ProductPairStage item={item} />

        <div className={styles.body}>
          <span className={`label ${styles.category}`}>{item.categoryLabel}</span>
          <h3 className={`heading ${styles.headline}`}>{comparisonHeadline(item)}</h3>

          <div className={styles.prices}>
            <PriceSide side={item.womens} perUnit={item.perUnit} />
            <span className={styles.connector} aria-hidden="true">
              <ArrowRightIcon className={styles.connectorIcon} />
            </span>
            <PriceSide side={item.other} perUnit={item.perUnit} lower />
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
            Compare
            <ArrowRightIcon className={styles.arrow} />
          </span>
        </div>
      </Link>
    </div>
  );
}
