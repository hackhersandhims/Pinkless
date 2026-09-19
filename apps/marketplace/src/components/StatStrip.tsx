import type { FeedSummary } from '../lib/catalog';
import { formatCents } from '../lib/money';
import styles from './StatStrip.module.css';

export type StatStripProps = {
  summary: FeedSummary;
};

/**
 * A compact trust strip under the hero. Numbers come only from the listed
 * comparisons. Term comes first in the DOM (reads "label, value"); the value
 * is drawn before it.
 */
export function StatStrip({ summary }: StatStripProps) {
  return (
    <section className={`container ${styles.wrap}`} aria-label="Marketplace at a glance">
      <dl className={styles.strip}>
        <Stat
          value={String(summary.count)}
          term={summary.count === 1 ? 'comparison' : 'comparisons'}
        />
        <Stat
          value={String(summary.retailers.length)}
          term={summary.retailers.length === 1 ? 'retailer' : 'retailers'}
        />
        {summary.maxSavingsCents !== undefined ? (
          <Stat value={formatCents(summary.maxSavingsCents)} term="largest saving" />
        ) : null}
      </dl>
    </section>
  );
}

function Stat({ value, term }: { value: string; term: string }) {
  return (
    <div className={styles.stat}>
      <dt className={`caption ${styles.term}`}>{term}</dt>
      <dd className={`heading ${styles.value}`}>{value}</dd>
    </div>
  );
}
