import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export type EmptyStateProps = {
  title: string;
  body: string;
  /** Recovery actions: links or buttons. */
  children?: ReactNode;
};

/** Empty category, no search results, not-found, and load-failure messages. */
export function EmptyState({ title, body, children }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <p className={`heading ${styles.title}`}>{title}</p>
      <p className={`body ${styles.body}`}>{body}</p>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </div>
  );
}
