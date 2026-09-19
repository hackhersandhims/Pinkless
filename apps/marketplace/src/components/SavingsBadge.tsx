import { formatLess } from '../lib/money';
import styles from './SavingsBadge.module.css';

export type SavingsBadgeProps = {
  /** Strictly positive integer cents. */
  cents: number;
};

/** Compact "$2.00 less" chip. Pink is the brand accent; text stays --ink. */
export function SavingsBadge({ cents }: SavingsBadgeProps) {
  return <span className={`label ${styles.badge}`}>{formatLess(cents)}</span>;
}
