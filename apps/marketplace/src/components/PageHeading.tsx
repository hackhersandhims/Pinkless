import styles from './PageHeading.module.css';

export type PageHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

/** The page's single <h1>, with an optional eyebrow and one-line description. */
export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <header className={styles.head}>
      {eyebrow ? <p className={`label ${styles.eyebrow}`}>{eyebrow}</p> : null}
      {/* .display supplies family and weight; the h1 scales its size by ratio. */}
      <div className="display">
        <h1 className={styles.title}>{title}</h1>
      </div>
      {description ? <p className={`body ${styles.description}`}>{description}</p> : null}
    </header>
  );
}
