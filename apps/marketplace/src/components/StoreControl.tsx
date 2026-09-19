import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { storeLabel } from '../lib/catalog';
import { useComparisons } from '../routes/useComparisons';
import { StoreIcon } from './icons';
import { StorePicker } from './StorePicker';
import styles from './StoreControl.module.css';

const PANEL_ID = 'store-panel';

/**
 * Header control: the chosen store's name and a "Change store" disclosure
 * that opens the ZIP picker below the header bar. Escape or choosing a store
 * closes it and returns focus to the toggle. Hidden until a store is chosen,
 * because the home page leads with the picker.
 */
export function StoreControl() {
  const { store } = useComparisons();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  // A route change closes the panel.
  useEffect(() => setOpen(false), [pathname]);

  if (!store) return null;

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close();
    }
  }

  return (
    <div className={styles.wrap} onKeyDown={onKeyDown}>
      <div className={styles.bar}>
        <StoreIcon className={styles.icon} />
        <span className={`caption ${styles.current}`}>
          <span className="visually-hidden">Your Kroger store: </span>
          {storeLabel(store)}
        </span>
        <button
          ref={toggleRef}
          type="button"
          className={`caption ${styles.toggle}`}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close' : 'Change store'}
        </button>
      </div>
      <div id={PANEL_ID} className={styles.panel} hidden={!open}>
        {open ? (
          <StorePicker
            title="Change your Kroger store"
            headingLevel={2}
            autoFocus
            onSelected={close}
          />
        ) : null}
      </div>
    </div>
  );
}
