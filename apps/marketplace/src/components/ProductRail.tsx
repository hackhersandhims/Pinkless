import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { To } from 'react-router-dom';
import type { ComparisonView } from '../lib/types';
import { ComparisonCard } from './ComparisonCard';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { SectionHeader } from './SectionHeader';
import styles from './ProductRail.module.css';

export type ProductRailProps = {
  /** Unique per page; ties the section to its heading. */
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  items: ComparisonView[];
  seeAll?: { to: To; label: string };
};

/**
 * Horizontal shelf of product cards. Plain CSS overflow with scroll snap does
 * the scrolling (touch, trackpad, keyboard focus); the arrow buttons only
 * appear when there are more cards than fit, and just scroll that same track.
 */
export function ProductRail({ id, eyebrow, title, description, items, seeAll }: ProductRailProps) {
  const headingId = `${id}-heading`;
  const trackRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdge({
      atStart: track.scrollLeft <= 1,
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure, items.length]);

  function scrollByPage(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy?.({
      left: direction * track.clientWidth * 0.9,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  const scrollable = !(edge.atStart && edge.atEnd);

  return (
    <section aria-labelledby={headingId}>
      <SectionHeader
        id={headingId}
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <>
            {seeAll ? (
              <Link to={seeAll.to} className={`body ${styles.seeAll}`}>
                {seeAll.label}
                <ArrowRightIcon className={styles.arrow} />
              </Link>
            ) : null}
            {scrollable ? (
              <div className={styles.arrows}>
                <button
                  type="button"
                  className={styles.arrowButton}
                  onClick={() => scrollByPage(-1)}
                  disabled={edge.atStart}
                  aria-label={`Scroll ${title} back`}
                >
                  <ChevronLeftIcon className={styles.arrowIcon} />
                </button>
                <button
                  type="button"
                  className={styles.arrowButton}
                  onClick={() => scrollByPage(1)}
                  disabled={edge.atEnd}
                  aria-label={`Scroll ${title} forward`}
                >
                  <ChevronRightIcon className={styles.arrowIcon} />
                </button>
              </div>
            ) : null}
          </>
        }
      />
      <ul ref={trackRef} className={styles.track} onScroll={measure}>
        {items.map((item) => (
          <li key={item.id} className={styles.slot}>
            <ComparisonCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
