import type { CategorySlug } from '../lib/types';
import { CATEGORY_ICONS } from './icons';
import styles from './ProductMedia.module.css';

export type ProductMediaProps = {
  category: CategorySlug;
  /** "stage" is the roomy detail-page frame; the default is the compact card frame. */
  size?: 'card' | 'stage';
};

/**
 * Neutral image stage. The catalog carries no product images and `Product`
 * has no image field, so this shows a small category mark on a soft tint.
 * When image URLs exist, render the <img> here (object-fit: contain, centered)
 * and keep this as the fallback. Decorative: the product name is always text.
 */
export function ProductMedia({ category, size = 'card' }: ProductMediaProps) {
  const CategoryIcon = CATEGORY_ICONS[category];
  return (
    <div className={`${styles.media} ${size === 'stage' ? styles.stage : ''}`} aria-hidden="true">
      <span className={styles.disc}>
        <CategoryIcon className={styles.icon} />
      </span>
    </div>
  );
}
