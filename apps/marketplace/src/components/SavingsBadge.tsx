import { formatLess } from '../lib/money';
import styles from './SavingsBadge.module.css';

export type SavingsBadgeProps = {
  /** Strictly positive integer cents. */
  cents: number;
  /** Whole-number percent lower, from the view model; omitted when absent. */
  percentLower?: number;
  /** Savings is for the women's product's amount (different pack sizes). */
  perUnit?: boolean;
  /**
   * "chip" is the compact inline pill. "bridge" is the plum pill that sits
   * between two products on a comparison stage.
   */
  variant?: 'chip' | 'bridge';
};

/**
 * "$2.00 less", optionally with "18% lower". Every value comes from the
 * comparison view model; the badge never computes a saving itself.
 */
export function SavingsBadge({
  cents,
  percentLower,
  perUnit = false,
  variant = 'chip',
}: SavingsBadgeProps) {
  if (variant === 'chip') {
    return <span className={`label ${styles.badge}`}>{formatLess(cents)}</span>;
  }
  return (
    <span className={styles.bridge}>
      <span className={`label ${styles.amount}`}>{formatLess(cents)}</span>
      {percentLower !== undefined ? (
        <span className={`caption ${styles.percent}`}>{percentLower}% lower</span>
      ) : null}
      {perUnit ? <span className={`caption ${styles.percent}`}>same amount</span> : null}
    </span>
  );
}
