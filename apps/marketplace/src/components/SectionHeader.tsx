import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';

export type SectionHeaderProps = {
  /** Ties the parent <section> to this heading via aria-labelledby. */
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned controls, e.g. a "View all" link. */
  action?: ReactNode;
};

/** Short editorial section heading: small eyebrow, bold title, optional one-line description. */
export function SectionHeader({ id, eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        {eyebrow ? <p className={`label ${styles.eyebrow}`}>{eyebrow}</p> : null}
        {/* .display supplies family/weight; the h2 scales its size by ratio (see module CSS). */}
        <div className="display">
          <h2 id={id} className={styles.title}>
            {title}
          </h2>
        </div>
        {description ? <p className={`body ${styles.description}`}>{description}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
