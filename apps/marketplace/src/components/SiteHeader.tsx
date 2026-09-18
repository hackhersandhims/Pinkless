import { NavLink } from 'react-router-dom';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/types';
import logo from '../../../../packages/tokens/assets/pinkless-lockup.png';
import styles from './SiteHeader.module.css';

export type SiteHeaderProps = Record<string, never>;

/** Global site header: skip link, logo lockup, and category navigation. */
export function SiteHeader(_props: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <img src={logo} alt="Pinkless" className={styles.logo} />
      <nav aria-label="Categories">
        <ul className={styles.nav}>
          {CATEGORY_ORDER.map((slug) => (
            <li key={slug}>
              <NavLink
                to={`/category/${slug}`}
                className={({ isActive }) =>
                  `${styles.navLink} label ${isActive ? styles.navLinkActive : ''}`
                }
              >
                {CATEGORY_LABELS[slug]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
