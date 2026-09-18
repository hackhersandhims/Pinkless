import { Link } from 'react-router-dom';
import type { ComparisonView } from '../lib/types';
import { RETAILER_LABELS } from '../lib/types';
import { HeroComparison } from './HeroComparison';
import buttons from './Button.module.css';
import styles from './Hero.module.css';

export type HeroProps = {
  /** The comparison shown in the visual (the largest saving); undefined when there is none. */
  featured?: ComparisonView;
  loading?: boolean;
};

const RETAILER_LIST = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(
  Object.values(RETAILER_LABELS),
);

/**
 * Editorial home hero: copy on the cream page, and a layered comparison built
 * from a real listed comparison on a pink stage. The copy says what Pinkless
 * verifiably does (the same packaged product, lower price elsewhere, dated)
 * and makes no claim about why prices differ (REQUIREMENTS §1, §2).
 */
export function Hero({ featured, loading = false }: HeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`container ${styles.inner}`}>
        {/*
         * .display supplies family and weight; the h1 scales its size by ratio
         * from that token (see module CSS). A larger display token from the
         * design system would replace this.
         */}
        <div className={`display ${styles.copy}`}>
          <p className={`label ${styles.eyebrow}`}>Price comparison for everyday essentials</p>
          <h1 id="hero-title" className={styles.headline}>
            <span>Same essentials.</span> <span>Smarter prices.</span>
          </h1>
          <p className={`body ${styles.sub}`}>
            Pinkless checks the exact packaged product across {RETAILER_LIST} and shows you where it
            costs less, with the date we checked.
          </p>
          <div className={styles.actions}>
            <Link
              to={{ hash: '#biggest-savings' }}
              className={`body ${buttons.button} ${buttons.dark}`}
            >
              Browse comparisons
            </Link>
            <Link
              to={{ hash: '#how-it-works' }}
              className={`body ${buttons.button} ${buttons.outline}`}
            >
              How it works
            </Link>
          </div>
        </div>

        <HeroComparison item={featured} loading={loading} />
      </div>
    </section>
  );
}
