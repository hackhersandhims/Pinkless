import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Client-side routing neither scrolls to the top on a new page nor to a
 * `#hash` target, so do both. Renders nothing.
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView?.();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
