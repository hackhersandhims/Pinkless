import { Link } from 'react-router-dom';
import logo from '../../../../packages/tokens/assets/pinkless-lockup-transparent.png';
import { CategoryNav } from './CategoryNav';
import { SearchBar } from './SearchBar';
import { StoreControl } from './StoreControl';
import { useStoreLink } from '../routes/useStore';
import styles from './SiteHeader.module.css';

/**
 * Global header on the cream surface: brand, a dominant search field, the
 * chosen Kroger store with a "Change store" control, one utility link, then
 * the category row. There are no account, cart, or
 * saved-item controls because the Marketplace has none (REQUIREMENTS §2, §3).
 */
export function SiteHeader() {
  const link = useStoreLink();
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <a href="#main" className={styles.skipLink}>
          Skip to content
        </a>
        <Link to={link('/')} className={styles.brand}>
          {/*
           * The lockup with its near-black ground keyed out to transparency
           * (same pixels otherwise). The frame crops to the star and wordmark,
           * hiding the tagline.
           */}
          <span className={styles.logoFrame}>
            <img src={logo} alt="Pinkless" className={styles.logo} />
          </span>
        </Link>
        <div className={styles.search}>
          <SearchBar />
        </div>
        <div className={styles.store}>
          <StoreControl />
        </div>
        <Link to={link('/', { hash: '#how-it-works' })} className={`body ${styles.utility}`}>
          How it works
        </Link>
      </div>
      <CategoryNav />
    </header>
  );
}
