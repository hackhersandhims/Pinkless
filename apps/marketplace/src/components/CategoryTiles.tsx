import { Link } from 'react-router-dom';
import type { CategoryGroup } from '../lib/types';
import { formatCents } from '../lib/money';
import { useStoreLink } from '../routes/useStore';
import { ArrowRightIcon, CATEGORY_ICONS, GridIcon } from './icons';
import { SectionHeader } from './SectionHeader';
import styles from './CategoryTiles.module.css';

export type CategoryTilesProps = {
  groups: CategoryGroup[];
};

/** "Shop by category": a tile per category with comparisons at this store, plus one for everything. */
export function CategoryTiles({ groups }: CategoryTilesProps) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const link = useStoreLink();

  return (
    <section className={`container ${styles.section}`} aria-labelledby="shop-by-category">
      <SectionHeader id="shop-by-category" eyebrow="Explore" title="Shop by category" />
      <ul className={styles.list}>
        {groups.map((group) => {
          const CategoryIcon = CATEGORY_ICONS[group.slug];
          const best = Math.max(...group.items.map((item) => item.savingsCents));
          const count = group.items.length;
          return (
            <li key={group.slug}>
              <Link to={link(`/category/${group.slug}`)} className={styles.tile}>
                <span className={styles.iconWrap}>
                  <CategoryIcon className={styles.icon} />
                </span>
                <span className={styles.text}>
                  <span className={`heading ${styles.label}`}>{group.label}</span>
                  <span className="caption">
                    {count} {count === 1 ? 'comparison' : 'comparisons'} · up to {formatCents(best)}{' '}
                    less
                  </span>
                </span>
                <ArrowRightIcon className={styles.arrow} />
              </Link>
            </li>
          );
        })}
        <li>
          <Link to={link('/search')} className={`${styles.tile} ${styles.all}`}>
            <span className={styles.iconWrap}>
              <GridIcon className={styles.icon} />
            </span>
            <span className={styles.text}>
              <span className={`heading ${styles.label}`}>All comparisons</span>
              <span className="caption">
                {total} {total === 1 ? 'comparison' : 'comparisons'} at this store, biggest
                difference first
              </span>
            </span>
            <ArrowRightIcon className={styles.arrow} />
          </Link>
        </li>
      </ul>
    </section>
  );
}
