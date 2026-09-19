import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { isValidPostalCode, loadStores } from '../lib/api';
import type { StoreLocation } from '../lib/types';
import { STORE_NAME_PARAM, STORE_PARAM } from '../routes/useStore';
import { ArrowRightIcon } from './icons';
import styles from './StorePicker.module.css';

export type StorePickerProps = {
  /** Heading text; the picker renders it as an h2 unless `headingLevel` says otherwise. */
  title?: string;
  headingLevel?: 2 | 3;
  /** Called after a store is chosen and written to the URL. */
  onSelected?: (store: StoreLocation) => void;
  /** Focus the ZIP field on mount. Only for pickers the shopper just opened. */
  autoFocus?: boolean;
};

type Lookup =
  | { status: 'idle' }
  | { status: 'loading'; postalCode: string }
  | { status: 'error'; postalCode: string }
  | { status: 'ready'; postalCode: string; stores: StoreLocation[] };

/**
 * Find a Kroger store by US ZIP code and choose one. The choice is written
 * to the URL query (`?store=…&storeName=…`) on the current page, so the
 * link is shareable; nothing is stored anywhere else.
 */
export function StorePicker({
  title = 'Choose your Kroger store',
  headingLevel = 2,
  onSelected,
  autoFocus = false,
}: StorePickerProps) {
  const uid = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [postalCode, setPostalCode] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [lookup, setLookup] = useState<Lookup>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    return () => controllerRef.current?.abort();
  }, [autoFocus]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const zip = postalCode.trim();
    if (!isValidPostalCode(zip)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLookup({ status: 'loading', postalCode: zip });
    try {
      const stores = await loadStores(zip, controller.signal);
      if (!controller.signal.aborted) setLookup({ status: 'ready', postalCode: zip, stores });
    } catch {
      if (!controller.signal.aborted) setLookup({ status: 'error', postalCode: zip });
    }
  }

  function choose(store: StoreLocation) {
    const next = new URLSearchParams(params);
    next.set(STORE_PARAM, store.locationId);
    next.set(STORE_NAME_PARAM, store.name);
    navigate({ pathname: location.pathname, search: `?${next}` });
    onSelected?.(store);
  }

  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const statusText =
    lookup.status === 'loading'
      ? `Looking up Kroger stores near ${lookup.postalCode}…`
      : lookup.status === 'error'
        ? `We couldn’t look up stores near ${lookup.postalCode}. Try again.`
        : lookup.status === 'ready'
          ? lookup.stores.length === 0
            ? `No Kroger stores found near ${lookup.postalCode}.`
            : `${lookup.stores.length} ${lookup.stores.length === 1 ? 'store' : 'stores'} near ${lookup.postalCode}. Choose one.`
          : '';

  return (
    <section className={styles.picker} aria-labelledby={`${uid}-title`}>
      <Heading id={`${uid}-title`} className={`heading ${styles.title}`}>
        {title}
      </Heading>
      <p className={`caption ${styles.intro}`}>
        Prices come from Kroger for the store you pick. Your store stays in the page address only.
      </p>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <label htmlFor={`${uid}-zip`} className="label">
          ZIP code
        </label>
        <div className={styles.row}>
          <input
            ref={inputRef}
            id={`${uid}-zip`}
            name="postalCode"
            className={`body ${styles.input}`}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="45202"
            value={postalCode}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${uid}-zip-error` : undefined}
            onChange={(event) => setPostalCode(event.target.value)}
          />
          <button type="submit" className={`body ${styles.submit}`}>
            Find stores
            <ArrowRightIcon className={styles.arrow} />
          </button>
        </div>
        {invalid ? (
          <p id={`${uid}-zip-error`} className={`caption ${styles.error}`}>
            Enter a five-digit US ZIP code.
          </p>
        ) : null}
      </form>

      <p role="status" className={`caption ${styles.status}`}>
        {statusText}
      </p>

      {lookup.status === 'ready' && lookup.stores.length > 0 ? (
        <ul className={styles.list} aria-label={`Kroger stores near ${lookup.postalCode}`}>
          {lookup.stores.map((store) => (
            <li key={store.locationId}>
              <button type="button" className={styles.store} onClick={() => choose(store)}>
                <span className={`body ${styles.storeName}`}>{store.name}</span>
                <span className={`caption ${styles.address}`}>
                  {store.address.line1}, {store.address.city}, {store.address.state}{' '}
                  {store.address.postalCode}
                </span>
                <ArrowRightIcon className={styles.storeArrow} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
