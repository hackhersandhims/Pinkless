import { Link } from 'react-router-dom';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className="caption">
          Source data reviewed by hand. No accounts, no tracking, no affiliate links.
        </p>
        <nav aria-label="Footer">
          <ul className={styles.links}>
            <li>
              <Link to="/search" className={`caption ${styles.link}`}>
                All comparisons
              </Link>
            </li>
            <li>
              <Link
                to={{ pathname: '/', hash: '#how-it-works' }}
                className={`caption ${styles.link}`}
              >
                How it works
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
