import styles from './SiteFooter.module.css';

export type SiteFooterProps = Record<string, never>;

export function SiteFooter(_props: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <p className="caption">
        Source data reviewed by hand. No accounts, no tracking, no affiliate links.
      </p>
    </footer>
  );
}
