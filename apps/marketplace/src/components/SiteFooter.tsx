import { Link } from 'react-router-dom';
import { useStoreLink } from '../routes/useStore';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  const link = useStoreLink();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className="caption">
          Prices from Kroger&apos;s official API. Pairs reviewed by hand. No accounts, no tracking,
          no affiliate links.
        </p>
        <nav aria-label="Footer">
          <ul className={styles.links}>
            <li>
              <Link to={link('/search')} className={`caption ${styles.link}`}>
                All comparisons
              </Link>
            </li>
            <li>
              <Link to={link('/', { hash: '#how-it-works' })} className={`caption ${styles.link}`}>
                How it works
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
