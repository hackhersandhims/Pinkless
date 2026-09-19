import { Link } from 'react-router-dom';
import logo from '../../../../packages/tokens/assets/pinkless-lockup.png';
import { CategoryNav } from './CategoryNav';
import { SearchBar } from './SearchBar';
import styles from './SiteHeader.module.css';

/**
 * Global header on the cream surface: brand, a dominant search field, one
 * utility link, then the category row. There are no account, cart, or
 * saved-item controls because the Marketplace has none (REQUIREMENTS §2, §3).
 */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <a href="#main" className={styles.skipLink}>
          Skip to content
        </a>
        <Link to="/" className={styles.brand}>
          {/*
           * The only approved logo asset is a flattened lockup with a
           * near-black ground and a tagline under the mark. The frame crops to
           * the star and wordmark without recoloring or redrawing it. A
           * transparent, header-specific lockup would remove the dark tile.
           */}
          <span className={styles.logoFrame}>
            <img src={logo} alt="Pinkless" className={styles.logo} />
          </span>
        </Link>
        <div className={styles.search}>
          <SearchBar />
        </div>
        <Link to={{ pathname: '/', hash: '#how-it-works' }} className={`body ${styles.utility}`}>
          How it works
        </Link>
      </div>
      <CategoryNav />
    </header>
  );
}
