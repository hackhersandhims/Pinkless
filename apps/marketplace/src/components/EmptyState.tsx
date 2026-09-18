import styles from './EmptyState.module.css';

export type EmptyStateProps = {
  title: string;
  body: string;
};

/** Used for an empty category and for not-found pages. */
export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <p className={`heading ${styles.title}`}>{title}</p>
      <p className={`body ${styles.body}`}>{body}</p>
    </div>
  );
}
