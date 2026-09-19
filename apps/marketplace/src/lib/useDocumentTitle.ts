import { useEffect } from 'react';

const SITE_TITLE = 'Pinkless Marketplace';

/** Sets `document.title` for the current route ("Razors · Pinkless Marketplace"). */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_TITLE}` : SITE_TITLE;
  }, [title]);
}
