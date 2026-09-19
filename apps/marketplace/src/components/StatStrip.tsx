import type { FeedSummary } from '../lib/catalog';
import { storeLabel } from '../lib/catalog';
import { formatCents } from '../lib/money';
import type { SelectedStore } from '../lib/types';
import styles from './StatStrip.module.css';

export type StatStripProps = {
  summary: FeedSummary;
  store: SelectedStore;
};

/**
 * A compact strip under the hero. Numbers come only from the comparisons
 * listed for this store. Term comes first in the DOM (reads "label, value");
 * the value is drawn before it.
 */
export function StatStrip({ summary, store }: StatStripProps) {
  return (
    <section className={`container ${styles.wrap}`} aria-label="This store at a glance">
      <dl className={styles.strip}>
        <Stat
          value={String(summary.count)}
          term={summary.count === 1 ? 'comparison at this store' : 'comparisons at this store'}
        />
        {summary.maxSavingsCents !== undefined ? (
          <Stat value={formatCents(summary.maxSavingsCents)} term="largest difference" />
        ) : null}
        <Stat value={storeLabel(store)} term="in-store prices" wide />
      </dl>
    </section>
  );
}

function Stat({ value, term, wide }: { value: string; term: string; wide?: boolean }) {
  return (
    <div className={`${styles.stat} ${wide ? styles.wide : ''}`}>
      <dt className={`caption ${styles.term}`}>{term}</dt>
      <dd className={`heading ${styles.value}`}>{value}</dd>
    </div>
  );
}
