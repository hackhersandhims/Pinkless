import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CategoryGroup, CategorySlug, ComparisonView } from '../lib/types';
import { krogerImageUrl } from '../lib/catalog';
import { formatCents } from '../lib/money';
import { useReveal } from '../motion/useReveal';
import { useStoreLink } from '../routes/useStore';
import { ArrowRightIcon, CATEGORY_ICONS } from './icons';
import { SectionHeader } from './SectionHeader';
import styles from './CategoryTiles.module.css';

export type CategoryTilesProps = {
  groups: CategoryGroup[];
};

/**
 * The category's product shot: Kroger's photo of its biggest-difference
 * comparison (women's product in front, the equivalent behind), falling
 * back to the category mark. Decorative — the category name is the link text.
 */
function CategoryVisual({ category, lead }: { category: CategorySlug; lead: ComparisonView }) {
  const front = krogerImageUrl(lead.womens.krogerProductId, 'large');
  const back = krogerImageUrl(lead.other.krogerProductId, 'large');
  const [failed, setFailed] = useState<string[]>([]);
  const ok = (src?: string): src is string => src !== undefined && !failed.includes(src);
  const onError = (src: string) => () => setFailed((list) => [...list, src]);
  const CategoryIcon = CATEGORY_ICONS[category];

  if (!ok(front)) {
    return (
      <span className={styles.disc}>
        <CategoryIcon className={styles.icon} />
      </span>
    );
  }
  return (
    <>
      {ok(back) ? (
        <img
          src={back}
          alt=""
          className={`${styles.photo} ${styles.photoBack}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={onError(back)}
        />
      ) : null}
      <img
        src={front}
        alt=""
        className={`${styles.photo} ${styles.photoFront}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={onError(front)}
      />
    </>
  );
}

/** "Shop by category": a merchandised tile per category with comparisons at this store. */
export function CategoryTiles({ groups }: CategoryTilesProps) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const link = useStoreLink();
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  // Fewer tiles → wider tiles, so a thin catalog still fills the row.
  const columns = Math.min(Math.max(groups.length, 2), 4);

  return (
    <section
      ref={ref}
      className={styles.band}
      aria-labelledby="shop-by-category"
    >
      <div className="container">
        <div className={styles.heading} data-reveal>
          <SectionHeader
            id="shop-by-category"
            eyebrow="Explore"
            title="Shop by category"
            description="Start with what you already buy."
            action={
              <Link to={link('/search')} className={`label ${styles.viewAll}`}>
                View all {total}
                <ArrowRightIcon className={styles.viewAllArrow} />
              </Link>
            }
          />
        </div>
        <ul className={styles.list} data-columns={columns}>
          {groups.map((group, index) => {
            const biggest = (list: ComparisonView[]) =>
              list.reduce((a, b) => (b.savingsCents > a.savingsCents ? b : a));
            // The tile's photo comes from its lead pair, so prefer the biggest saving
            // among pairs where both products have a photo; fall back to the biggest overall.
            const lead = biggest(
              (() => {
                const photographed = group.items.filter(
                  (item) =>
                    krogerImageUrl(item.womens.krogerProductId) &&
                    krogerImageUrl(item.other.krogerProductId),
                );
                return photographed.length > 0 ? photographed : group.items;
              })(),
            );
            const count = group.items.length;
            return (
              <li
                key={group.slug}
                className={styles.item}
                data-reveal
                {...(index > 0 ? { 'data-reveal-delay': String(Math.min(index, 4) * 60) } : {})}
              >
                <Link
                  to={link(`/category/${group.slug}`)}
                  className={styles.tile}
                  data-variant={index % 3}
                >
                  <span className={styles.stage} aria-hidden="true">
                    <span className={styles.visual}>
                      <CategoryVisual category={group.slug} lead={lead} />
                    </span>
                  </span>
                  <span className={styles.text}>
                    <span className={`heading ${styles.label}`}>{group.label}</span>
                    <span className="caption">
                      {count} {count === 1 ? 'comparison' : 'comparisons'} · up to{' '}
                      {formatCents(lead.savingsCents)} less
                    </span>
                    <span className={`label ${styles.explore}`}>
                      Explore <ArrowRightIcon className={styles.arrow} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
