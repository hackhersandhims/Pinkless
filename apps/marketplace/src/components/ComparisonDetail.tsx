import { Link } from 'react-router-dom';
import type { ComparisonView, ProductSide } from '../lib/types';
import { formatCents } from '../lib/money';
import { formatObservedAt } from '../lib/dates';
import { storeLabel } from '../lib/catalog';
import { comparisonHeadline, freshnessLine } from '../lib/copy';
import { useStoreLink } from '../routes/useStore';
import { ArrowRightIcon } from './icons';
import { ProductMedia } from './ProductMedia';
import { SavingsBadge } from './SavingsBadge';
import buttons from './Button.module.css';
import styles from './ComparisonDetail.module.css';

export type ComparisonDetailProps = {
  item: ComparisonView;
};

function ProductPanel({
  item,
  side,
  emphasis,
}: {
  item: ComparisonView;
  side: ProductSide;
  emphasis?: boolean;
}) {
  return (
    <div className={`${styles.offer} ${emphasis ? styles.offerEmphasis : ''}`}>
      <ProductMedia
        category={item.category}
        size="card"
        image={{ krogerProductId: side.krogerProductId, alt: side.name }}
      />
      <p className={`label ${styles.offerKind}`}>{side.marketedToLabel}</p>
      <h3 className={`heading ${styles.offerName}`}>{side.name}</h3>
      <span className="caption">
        {side.brand ? `${side.brand} · ` : ''}
        {side.variant}
      </span>
      <p className={`display ${styles.offerPrice}`}>{formatCents(side.priceCents)}</p>
      <span className="caption">
        {item.priceContextLabel} price at {storeLabel(item.store)}
      </span>
      <span className="caption">{formatObservedAt(side.observedAt)}</span>
      <a
        href={side.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`body ${styles.offerLink}`}
      >
        View on Kroger
        <span className="visually-hidden">: {side.name} (opens in a new tab)</span>
        <ArrowRightIcon className={styles.arrow} />
      </a>
    </div>
  );
}

/**
 * Comparison page body: the difference and both products up top, both
 * Kroger listings side by side (women's, then the cheaper men's or neutral
 * version), then why the pair was matched and what still differs. Both
 * prices come from one store in one price context, so the difference is a
 * plain subtraction of integer cents.
 */
export function ComparisonDetail({ item }: ComparisonDetailProps) {
  const link = useStoreLink();

  return (
    <article className={styles.wrap}>
      <nav aria-label="Breadcrumb">
        <ol className={`caption ${styles.crumbs}`}>
          <li>
            <Link to={link('/')}>Marketplace</Link>
          </li>
          <li>
            <Link to={link(`/category/${item.category}`)}>{item.categoryLabel}</Link>
          </li>
        </ol>
      </nav>

      <div className={styles.summary}>
        <div className={styles.pairMedia}>
          <ProductMedia
            category={item.category}
            size="thumb"
            image={{ krogerProductId: item.womens.krogerProductId, alt: item.womens.name }}
          />
          <ProductMedia
            category={item.category}
            size="thumb"
            image={{ krogerProductId: item.other.krogerProductId, alt: item.other.name }}
          />
        </div>
        <div className={styles.summaryText}>
          <span className={`label ${styles.eyebrow}`}>{item.categoryLabel}</span>
          {/* .display supplies family and weight; the h1 scales its size by ratio. */}
          <div className="display">
            <h1 className={styles.title}>{comparisonHeadline(item)}</h1>
          </div>
          <p className={`body ${styles.savingsNote}`}>
            {item.other.name} costs {formatCents(item.other.priceCents)}. {item.womens.name} costs{' '}
            {formatCents(item.womens.priceCents)}.
          </p>
          <div className={styles.savings}>
            <SavingsBadge cents={item.savingsCents} />
            {item.percentLower !== undefined ? (
              <span className="caption">{item.percentLower}% lower</span>
            ) : null}
          </div>
          <p className={`caption ${styles.fresh}`}>{freshnessLine(item)}</p>

          <div className={styles.actions}>
            <a
              href={item.other.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`body ${buttons.button} ${buttons.dark}`}
              aria-label={`See the ${item.versionLabel} on Kroger: ${item.other.name} (opens in a new tab)`}
            >
              See the {item.versionLabel}
            </a>
            <a
              href={item.womens.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`body ${buttons.button} ${buttons.outline}`}
              aria-label={`See the women’s version on Kroger: ${item.womens.name} (opens in a new tab)`}
            >
              See the women’s version
            </a>
          </div>
        </div>
      </div>

      <section aria-labelledby="compare-offers">
        <h2 id="compare-offers" className={`heading ${styles.sectionHeading}`}>
          Both prices, same store
        </h2>
        <div className={styles.offers}>
          <ProductPanel item={item} side={item.womens} />
          <ProductPanel item={item} side={item.other} emphasis />
        </div>
      </section>

      <section aria-labelledby="why-matched">
        <h2 id="why-matched" className={`heading ${styles.sectionHeading}`}>
          Why these match
        </h2>
        <p className="body">{item.rationale}</p>
        {item.matchedAttributes.length > 0 ? (
          <ul className={styles.chips} aria-label="Matched attributes">
            {item.matchedAttributes.map((attribute) => (
              <li key={attribute} className={`label ${styles.chip}`}>
                {attribute}
              </li>
            ))}
          </ul>
        ) : null}

        {item.knownDifferences.length > 0 ? (
          <>
            <h3 className={`body ${styles.subHeading}`}>Known differences</h3>
            <ul className={styles.list}>
              {item.knownDifferences.map((difference) => (
                <li key={difference} className="body">
                  {difference}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <p className={`caption ${styles.disclaimer}`}>
        Prices are Kroger’s {item.priceContextLabel.toLowerCase()} prices at{' '}
        {storeLabel(item.store)} on the date shown and may have changed. Pinkless shows reviewed
        comparisons; it does not say why prices differ.
      </p>
    </article>
  );
}
