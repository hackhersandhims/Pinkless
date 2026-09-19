import { StorePicker } from './StorePicker';
import styles from './StoreRequired.module.css';

/**
 * Shown in place of results on any page reached without a store. Prices are
 * per store, so there is nothing honest to list until one is chosen.
 */
export function StoreRequired() {
  return (
    <div className={styles.stage}>
      <StorePicker title="Choose a Kroger store to see comparisons" />
    </div>
  );
}
