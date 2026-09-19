import { useState } from 'react';
import { krogerImageUrl } from '../lib/catalog';
import type { CategorySlug } from '../lib/types';
import { CATEGORY_ICONS } from './icons';
import styles from './ProductMedia.module.css';

export type ProductMediaProps = {
  category: CategorySlug;
  /**
   * "stage" is the roomy detail frame, "thumb" a square tile, "card" the
   * default, and "bare" the photo alone with no frame, for a parent that
   * provides its own stage (ProductPairStage).
   */
  size?: 'card' | 'stage' | 'thumb' | 'bare' | 'hero';
  /** "large" (500px) for big frames; "medium" (200px) everywhere else. */
  resolution?: 'medium' | 'large';
  /** Kroger's product photo; the category mark shows if it is absent or fails to load. */
  image?: { krogerProductId: string; alt: string };
};

/**
 * Product image stage. Shows Kroger's own product photo when there is one
 * and falls back to a small category mark on a soft tint if the photo is
 * missing or fails to load. The mark is decorative: the product name is
 * always in text nearby.
 */
export function ProductMedia({ category, size = 'card', resolution = 'medium', image }: ProductMediaProps) {
  const src = image ? krogerImageUrl(image.krogerProductId, resolution) : undefined;
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  const showImage = src !== undefined && failedSrc !== src;
  const CategoryIcon = CATEGORY_ICONS[category];
  const sizeClass =
    size === 'stage'
      ? styles.stage
      : size === 'thumb'
        ? styles.thumb
        : size === 'bare'
          ? styles.bare
          : size === 'hero'
            ? styles.hero
            : '';

  return (
    <div className={`${styles.media} ${sizeClass}`} aria-hidden={showImage ? undefined : true}>
      {showImage ? (
        <img
          src={src}
          alt={image!.alt}
          className={styles.photo}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className={styles.disc}>
          <CategoryIcon className={styles.icon} />
        </span>
      )}
    </div>
  );
}
