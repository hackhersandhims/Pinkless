import type { ReactNode } from 'react';
import styles from './PageContainer.module.css';

/** Page-width wrapper with vertical rhythm for the non-home routes. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className={`container ${styles.page}`}>{children}</div>;
}
