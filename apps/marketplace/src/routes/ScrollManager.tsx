import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Client-side routing neither scrolls to the top on a new page nor to a
 * `#hash` target, so do both. Renders nothing.
 */
export function ScrollManager() {
  // `key` changes on every navigation, so re-clicking a link to the current
  // page (e.g. the logo on the homepage) still scrolls to the top.
  const { hash, key } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView?.();
      return;
    }
    window.scrollTo(0, 0);
  }, [key, hash]);

  return null;
}
