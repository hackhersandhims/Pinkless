import styles from './LoadingCards.module.css';

export type LoadingCardsProps = {
  count?: number;
};

/**
 * Placeholder cards with the real card's proportions, so content does not
 * jump when the feed arrives. Announced politely as "Loading comparisons…".
 */
export function LoadingCards({ count = 4 }: LoadingCardsProps) {
  return (
    <div role="status" className={styles.wrap}>
      <span className="visually-hidden">Loading comparisons…</span>
      <ul className={styles.grid} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className={styles.card}>
            <div className={`${styles.block} ${styles.media}`} />
            <div className={`${styles.block} ${styles.line}`} />
            <div className={`${styles.block} ${styles.line} ${styles.short}`} />
            <div className={`${styles.block} ${styles.price}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
