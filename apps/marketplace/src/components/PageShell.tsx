import type { ReactNode } from 'react';

export type PageShellProps = {
  children: ReactNode;
};

/**
 * The `#main` landmark. It is full-bleed on purpose: each section wraps its
 * own `.container`, so a section can carry a full-width background.
 */
export function PageShell({ children }: PageShellProps) {
  return (
    <main id="main" tabIndex={-1}>
      {children}
    </main>
  );
}
