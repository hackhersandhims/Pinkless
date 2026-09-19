import { useEffect, type RefObject } from 'react';
import './motion.css';

/** One observer for the whole app; each element is revealed once, then dropped. */
let observer: IntersectionObserver | undefined;

function sharedObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries, self) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-reveal', 'shown');
        self.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  );
  return observer;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Fades up every `[data-reveal]` element inside `root` (and `root` itself)
 * the first time it scrolls into view. Needs motion/motion.css.
 *
 * Without IntersectionObserver, or with reduced motion, nothing is hidden.
 * Elements already on screen at mount still animate in once.
 */
export function useReveal(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      return;
    }
    const targets = [
      ...(element.matches('[data-reveal]') ? [element] : []),
      ...element.querySelectorAll<HTMLElement>('[data-reveal]'),
    ].filter((target) => target.getAttribute('data-reveal') !== 'shown');
    const io = sharedObserver();
    for (const target of targets) {
      target.setAttribute('data-reveal', 'pending');
      io.observe(target);
    }
    return () => {
      for (const target of targets) {
        io.unobserve(target);
        // Never leave content hidden if the component unmounts mid-reveal.
        if (target.getAttribute('data-reveal') === 'pending') {
          target.setAttribute('data-reveal', 'shown');
        }
      }
    };
  }, [root]);
}
