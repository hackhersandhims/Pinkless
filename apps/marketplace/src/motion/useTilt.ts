import { useEffect, type RefObject } from 'react';

/** Pointer-following 3D tilt: sets --tilt-x / --tilt-y on the element. Off for reduced motion and touch. */
export function useTilt(ref: RefObject<HTMLElement | null>, maxDeg = 7): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    const onMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      element.style.setProperty('--tilt-x', `${(x * maxDeg * 2).toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${(-y * maxDeg * 2).toFixed(2)}deg`);
    };
    const onLeave = () => {
      element.style.removeProperty('--tilt-x');
      element.style.removeProperty('--tilt-y');
    };
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', onLeave);
    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
    };
  }, [ref, maxDeg]);
}
