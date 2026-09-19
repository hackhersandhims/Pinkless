import { Link } from 'react-router-dom';
import type { ComparisonView, SelectedStore } from '../lib/types';
import { storeLabel } from '../lib/catalog';
import { useStoreLink } from '../routes/useStore';
import { HeroComparison } from './HeroComparison';
import { StorePicker } from './StorePicker';
import buttons from './Button.module.css';
import styles from './Hero.module.css';

export type HeroProps = {
  /** The chosen store; without one the hero leads with the store picker. */
  store?: SelectedStore;
  /** The comparison shown in the visual (the largest saving); undefined when there is none. */
  featured?: ComparisonView;
  loading?: boolean;
};

/**
 * Editorial home hero: copy on the cream page, and on the pink stage either
 * the store picker (no store yet) or a real comparison from that store. The
 * copy says what Pinkless verifiably does (reviewed pairs, one store, Kroger's
 * prices, dated) and makes no claim about why prices differ.
 */
export function Hero({ store, featured, loading = false }: HeroProps) {
  const link = useStoreLink();

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`container ${styles.inner}`}>
        {/*
         * .display supplies family and weight; the h1 scales its size by ratio
         * from that token (see module CSS).
         */}
        <div className={`display ${styles.copy}`}>
          <p className={`label ${styles.eyebrow}`}>
            {store ? `Prices at ${storeLabel(store)}` : 'Kroger price comparisons'}
          </p>
          <h1 id="hero-title" className={styles.headline}>
            <span>Before you buy,</span> <span>check the men’s version.</span>
          </h1>
          <p className={`body ${styles.sub}`}>
            Pinkless pairs products marketed to women with reviewed men’s or neutral equivalents,
            prices both at the same Kroger store, and shows the pair only when the other version
            costs less. Every price shows the store and the date we checked it.
          </p>
          <div className={styles.actions}>
            {store ? (
              <Link
                to={link('/', { hash: '#biggest-savings' })}
                className={`body ${buttons.button} ${buttons.dark}`}
              >
                Browse comparisons
              </Link>
            ) : null}
            <Link
              to={link('/', { hash: '#how-it-works' })}
              className={`body ${buttons.button} ${buttons.outline}`}
            >
              How it works
            </Link>
          </div>
        </div>

        {store ? (
          <HeroComparison item={featured} loading={loading} />
        ) : (
          <div className={styles.pickerStage}>
            <StorePicker title="Start with your Kroger store" />
          </div>
        )}
      </div>
    </section>
  );
}
