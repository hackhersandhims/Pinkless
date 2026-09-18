import type { ComparisonView, OfferView } from '../lib/types';
import { formatCents, formatSavings } from '../lib/money';
import { formatObservedAt } from '../lib/dates';
import styles from './ComparisonDetail.module.css';

export type ComparisonDetailProps = {
  item: ComparisonView;
};

function OfferPanel({ offer, heading }: { offer: OfferView; heading: string }) {
  return (
    <div className={styles.offer}>
      <p className={`label ${styles.offerRetailer}`}>{heading}</p>
      <p className={`heading ${styles.offerPrice}`}>{offer.retailerLabel}</p>
      <span className={`body ${styles.offerLine}`}>{formatCents(offer.priceCents)}</span>
      <span className={`caption ${styles.offerLine}`}>{offer.priceContextLabel}</span>
      <span className={`caption ${styles.offerLine}`}>{formatObservedAt(offer.observedAt)}</span>
    </div>
  );
}

/** Full comparison page body: side-by-side offers, rationale, and outbound CTA. */
export function ComparisonDetail({ item }: ComparisonDetailProps) {
  return (
    <div className={styles.wrap}>
      <span className={`label ${styles.category}`}>{item.categoryLabel}</span>
      <h1 className={`display ${styles.title}`}>{item.name}</h1>
      <span className={`caption ${styles.meta}`}>
        {item.brand ? `${item.brand} · ` : ''}
        {item.variant}
      </span>

      <div className={styles.offers}>
        <OfferPanel offer={item.reference} heading="Where you're shopping" />
        <OfferPanel offer={item.alternative} heading="Verified comparable alternative" />
      </div>

      <p className={`heading ${styles.savings}`}>{formatSavings(item.savingsCents)}</p>

      <section className={styles.rationaleSection} aria-labelledby="why-matched">
        <h2 id="why-matched" className={`heading ${styles.sectionHeading}`}>
          Why this was matched
        </h2>
        <p className="body">{item.rationale}</p>
        <ul className={styles.list}>
          {item.matchedAttributes.map((attribute) => (
            <li key={attribute} className="body">
              {attribute}
            </li>
          ))}
        </ul>

        {item.knownDifferences.length > 0 ? (
          <>
            <h3 className={`heading ${styles.sectionHeading}`}>Known differences</h3>
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

      {/* Only filled button in the app; no CTA token exists yet — see module CSS. */}
      <a
        href={item.alternative.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cta}
      >
        See alternative
      </a>

      <span className={`caption ${styles.disclaimer}`}>
        Prices verified on the date shown and may have changed. Pinkless shows reviewed
        comparisons; it does not make claims about pricing intent.
      </span>
    </div>
  );
}
