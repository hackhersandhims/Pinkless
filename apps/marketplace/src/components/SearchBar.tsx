import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { readStore, storeSearch } from '../routes/useStore';
import { ArrowRightIcon, SearchIcon } from './icons';
import styles from './SearchBar.module.css';

/**
 * Site search. Submitting goes to /search?q=… (keeping the chosen store),
 * which filters the comparisons already loaded; there is no search backend. The input mirrors the
 * current `q` so the box always reflects what the results show.
 */
export function SearchBar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);

  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    navigate({
      pathname: '/search',
      search: storeSearch(readStore(params), query ? { q: query } : {}),
    });
  }

  return (
    <form role="search" className={styles.form} onSubmit={onSubmit}>
      <label htmlFor="site-search" className="visually-hidden">
        Search products or categories
      </label>
      <SearchIcon className={styles.lead} />
      <input
        id="site-search"
        name="q"
        type="search"
        className={`body ${styles.input}`}
        placeholder="Search products or categories"
        autoComplete="off"
        enterKeyHint="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className={styles.submit}>
        <ArrowRightIcon className={styles.arrow} />
        <span className="visually-hidden">Search</span>
      </button>
    </form>
  );
}
