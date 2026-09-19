import { Link } from 'react-router-dom';
import type { ComparisonView, OfferView } from '../lib/types';
import { formatCents, formatSavings, percentLower } from '../lib/money';
import { formatObservedAt } from '../lib/dates';
import { ProductMedia } from './ProductMedia';
import buttons from './Button.module.css';
import styles from './ComparisonDetail.module.css';

export type ComparisonDetailProps = {
  item: ComparisonView;
};

function OfferPanel({
  offer,
  heading,
  productName,
  emphasis,
}: {
  offer: OfferView;
  heading: string;
  productName: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`${styles.offer} ${emphasis ? styles.offerEmphasis : ''}`}>
      <p className={`label ${styles.offerKind}`}>{heading}</p>
      <p className={`heading ${styles.offerRetailer}`}>{productName}</p>
      <p className={`display ${styles.offerPrice}`}>{formatCents(offer.priceCents)}</p>
      <span className="caption">
        {offer.retailerLabel} · {offer.priceContextLabel} price
      </span>
      <span className="caption">{formatObservedAt(offer.observedAt)}</span>
    </div>
  );
}

/** Full detail for two reviewed products priced at the same retailer. */
export function ComparisonDetail({ item }: ComparisonDetailProps) {
  const percent = percentLower(item.savingsCents, item.reference.priceCents);

  return (
    <article className={styles.wrap}>
      <nav aria-label="Breadcrumb">
        <ol className={`caption ${styles.crumbs}`}>
          <li>
            <Link to="/">Marketplace</Link>
          </li>
          <li>
            <Link to={`/category/${item.category}`}>{item.categoryLabel}</Link>
          </li>
        </ol>
      </nav>

      <div className={styles.summary}>
        <ProductMedia category={item.category} size="stage" />
        <div className={styles.summaryText}>
          <span className={`label ${styles.eyebrow}`}>{item.categoryLabel}</span>
          <div className="display">
            <h1 className={styles.title}>{item.alternativeName}</h1>
          </div>
          <span className="caption">{item.alternativeVariant}</span>

          <p className={`display ${styles.savings}`}>{formatSavings(item.savingsCents)}</p>
          <p className={`body ${styles.savingsNote}`}>
            {percent !== undefined ? `${percent}% lower than ` : 'Lower than '}
            {item.name} at {item.reference.retailerLabel}.
          </p>

          <a
            href={item.alternative.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`body ${buttons.button} ${buttons.dark} ${styles.cta}`}
            aria-label={`See men's alternative at ${item.alternative.retailerLabel} (opens in a new tab)`}
          >
            See men's alternative
          </a>
        </div>
      </div>

      <section aria-labelledby="compare-offers">
        <h2 id="compare-offers" className={`heading ${styles.sectionHeading}`}>
          Two reviewed products, one retailer
        </h2>
        <div className={styles.offers}>
          <OfferPanel offer={item.reference} heading="Women's product" productName={item.name} />
          <OfferPanel
            offer={item.alternative}
            heading="Men's alternative"
            productName={item.alternativeName}
            emphasis
          />
        </div>
      </section>

      <section aria-labelledby="why-matched">
        <h2 id="why-matched" className={`heading ${styles.sectionHeading}`}>
          Why this was matched
        </h2>
        <p className="body">{item.rationale}</p>
        <ul className={styles.chips}>
          {item.matchedAttributes.map((attribute) => (
            <li key={attribute} className={`label ${styles.chip}`}>
              {attribute}
            </li>
          ))}
        </ul>

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

      <span className="caption">
        Prices verified on the date shown and may have changed. Pinkless shows reviewed comparisons;
        it does not make claims about pricing intent.
      </span>
    </article>
  );
}
