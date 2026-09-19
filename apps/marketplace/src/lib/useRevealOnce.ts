import { useLayoutEffect, useRef } from 'react';

/** Delay between cards revealed together, in ms (brief: 60–80ms). */
const STAGGER_MS = 70;
/** Caps the stagger so a long grid never makes the last card wait. */
const MAX_STEPS = 6;

/**
 * One-time scroll reveal without an animation dependency. The element gets
 * `data-reveal="pending"` before paint and `"shown"` when it enters the
 * viewport; CSS owns the motion. Cards that enter together stagger by their
 * position among their siblings. With no IntersectionObserver (tests, old
 * browsers) or reduced motion, nothing is hidden.
 */
export function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const item = element.closest('li') ?? element;
    const siblings = item.parentElement ? Array.from(item.parentElement.children) : [item];
    const step = Math.min(Math.max(siblings.indexOf(item), 0), MAX_STEPS);
    element.style.setProperty('--reveal-delay', `${step * STAGGER_MS}ms`);
    element.dataset.reveal = 'pending';

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.reveal = 'shown';
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}
