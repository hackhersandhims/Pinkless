import { Link } from 'react-router-dom';
import buttons from './Button.module.css';
import styles from './HowItWorks.module.css';

const STEPS = [
  {
    title: 'Find the exact product',
    body: 'Each comparison is one reviewed product, matched by its UPC. A similar title or the same brand is never enough.',
  },
  {
    title: 'Compare like with like',
    body: 'Prices are only compared in the same context: online with online, store pickup with store pickup.',
  },
  {
    title: 'See the cheaper option',
    body: 'Every price shows the retailer, how it is fulfilled, and when we last checked it.',
  },
] as const;

/**
 * "How it works" on the plum surface, the page's one deep-contrast moment.
 * Each step describes a rule the matcher actually enforces (exact UPC
 * identity, same price context, observation time); do not add a step the
 * matcher does not perform.
 */
export function HowItWorks() {
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
              <span>Same product.</span> <span>Clearer comparison.</span>
            </h2>
          </div>
          <p className={`body ${styles.lead}`}>
            If we can&apos;t confirm two listings are the same item at a fair price, we don&apos;t
            show the comparison.
          </p>
          <Link to="/search" className={`body ${buttons.button} ${buttons.light}`}>
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
