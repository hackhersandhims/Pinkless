import { NavLink } from 'react-router-dom';
import { groupByCategory } from '../lib/catalog';
import { useComparisons } from '../routes/useComparisons';
import { useStoreLink } from '../routes/useStore';
import styles from './CategoryNav.module.css';

/**
 * Discovery row under the header. Category links come from the loaded feed,
 * so a category with no active comparison never gets a nav entry. Until the
 * feed is ready only "All comparisons" shows.
 */
export function CategoryNav() {
  const { state } = useComparisons();
  const groups = state.status === 'ready' ? groupByCategory(state.items) : [];
  const link = useStoreLink();

  return (
    <nav aria-label="Browse">
      <ul className={`container ${styles.list}`}>
        <li>
          <NavLink to={link('/search')} end className={({ isActive }) => linkClass(isActive)}>
            All comparisons
          </NavLink>
        </li>
        {groups.map((group) => (
          <li key={group.slug}>
            <NavLink
              to={link(`/category/${group.slug}`)}
              className={({ isActive }) => linkClass(isActive)}
            >
              {group.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function linkClass(isActive: boolean): string {
  return `caption ${styles.link} ${isActive ? styles.active : ''}`;
}
