import { Link } from 'react-router-dom';
import { useStoreLink } from '../routes/useStore';
import buttons from './Button.module.css';
import styles from './HowItWorks.module.css';

const STEPS = [
  {
    title: 'Pick your Kroger store',
    body: 'Both products are priced by Kroger’s official API at the store you choose, in store. We never compare prices from two different stores.',
  },
  {
    title: 'Compare reviewed pairs',
    body: 'A person pairs each product marketed to women with a men’s or neutral product in the same category and form, and writes down what still differs. When sizes differ, prices are compared for the same amount.',
  },
  {
    title: 'See it only when it costs less',
    body: 'A comparison appears only when the other version costs less at that store. Every price shows the store and when we checked it.',
  },
] as const;

/**
 * "How it works" on the plum surface, the page's one deep-contrast moment.
 * Each step describes a rule the catalog and matcher actually enforce (one
 * store and price context, a reviewed pair with the same category and size,
 * positive savings only); do not add a step they do not perform.
 */
export function HowItWorks() {
  const link = useStoreLink();
  return (
    <section
      id="how-it-works"
      className={`container ${styles.wrap}`}
      aria-labelledby="how-it-works-title"
    >
      <div className={styles.panel}>
        <div className={styles.intro}>
          <p className={`label ${styles.eyebrow}`}>How Pinkless works</p>
          {/* .display supplies family and weight; the h2 scales its size by ratio. */}
          <div className="display">
            <h2 id="how-it-works-title" className={styles.title}>
              <span>One store.</span> <span>Reviewed pairs.</span>
            </h2>
          </div>
          <p className={`body ${styles.lead}`}>
            If we can&apos;t price both products at the same store, we don&apos;t show the
            comparison.
          </p>
          <Link to={link('/search')} className={`body ${buttons.button} ${buttons.light}`}>
            Browse comparisons
          </Link>
        </div>

        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={`heading ${styles.number}`} aria-hidden="true">
                {index + 1}
              </span>
              <div className={styles.stepText}>
                <h3 className={`body ${styles.stepTitle}`}>{step.title}</h3>
                <p className={`caption ${styles.stepBody}`}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className={`caption ${styles.note}`}>
          Pinkless shows reviewed price comparisons. It does not say why a price differs.
        </p>
      </div>
    </section>
  );
}
