import type { ReactNode } from 'react';
import styles from './PageShell.module.css';

export type PageShellProps = {
  children: ReactNode;
};

/** Constrains page content to the reading width and provides the `#main` landmark. */
export function PageShell({ children }: PageShellProps) {
  return (
    <main id="main" className={styles.shell}>
      {children}
    </main>
  );
}
