import type { ComparisonView } from '../lib/types';
import { ProductMedia } from './ProductMedia';
import { SavingsBadge } from './SavingsBadge';
import styles from './ProductPairStage.module.css';

export type ProductPairStageProps = {
  item: ComparisonView;
  /** "card" for rails and grids, "feature" for a larger standalone pair. */
  size?: 'card' | 'feature';
};

/**
 * The Pinkless pair: both real Kroger package photos on one shared stage.
 * The women's product sits slightly back and higher; the men's or neutral
 * version sits in front, a little larger. The savings bridge straddles the
 * stage's bottom edge between them. Position is decoration only: the badge
 * and the surrounding text state the saving explicitly.
 */
export function ProductPairStage({ item, size = 'card' }: ProductPairStageProps) {
  return (
    <div className={`${styles.stage} ${size === 'feature' ? styles.feature : ''}`}>
      <div className={`${styles.product} ${styles.back}`}>
        <ProductMedia
          category={item.category}
          size="bare"
          image={{ krogerProductId: item.womens.krogerProductId, alt: item.womens.name }}
        />
      </div>
      <div className={`${styles.product} ${styles.front}`}>
        <ProductMedia
          category={item.category}
          size="bare"
          image={{ krogerProductId: item.other.krogerProductId, alt: item.other.name }}
        />
      </div>
      <div className={styles.bridge}>
        <SavingsBadge
          variant="bridge"
          cents={item.savingsCents}
          percentLower={item.percentLower}
          perUnit={item.perUnit}
        />
      </div>
    </div>
  );
}
