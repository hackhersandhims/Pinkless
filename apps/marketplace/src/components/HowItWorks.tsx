import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../motion/useReveal';
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
    title: 'See the lower price',
    body: 'A comparison appears only when the other version costs less at that store. Every price shows the store and when we checked it.',
  },
] as const;

/** Step stagger: 01 enters with the text column's end, then 80ms apart (rounded to the 60ms grid). */
const STEP_DELAYS = ['120', '180', '240'] as const;

/**
 * "How it works" on the plum surface: the page's editorial intermission.
 * Each step describes a rule the catalog and matcher actually enforce (one
 * store and price context, a reviewed pair in the same category and unit,
 * positive savings only); do not add a step they do not perform.
 */
export function HowItWorks() {
  const link = useStoreLink();
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section
      ref={ref}
      id="how-it-works"
      className={`container ${styles.wrap}`}
      aria-labelledby="how-it-works-title"
    >
      <div className={styles.panel}>
        {/* Decorative: palette-derived rings, cropped off the panel's edge. */}
        <div className={styles.motif} aria-hidden="true" data-reveal data-reveal-variant="scale" />

        <div className={styles.intro}>
          <p className={`label ${styles.eyebrow}`} data-reveal>
            How Pinkless works
          </p>
          {/* .display supplies family and weight; the h2 scales its size by ratio. */}
          <div className="display" data-reveal data-reveal-delay="60">
            <h2 id="how-it-works-title" className={styles.title}>
              <span>One store.</span> <span>Reviewed pairs.</span>{' '}
              <span className={styles.accent}>Real prices.</span>
            </h2>
          </div>
          <div className={styles.support} data-reveal data-reveal-delay="120">
            <p className={`body ${styles.lead}`}>
              If we can&apos;t price both products at the same store, we don&apos;t show the
              comparison.
            </p>
            <Link to={link('/search')} className={`body ${buttons.button} ${buttons.light}`}>
              Browse comparisons
            </Link>
          </div>
        </div>

        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className={styles.step}
              data-reveal
              data-reveal-delay={STEP_DELAYS[index]}
            >
              <span className={styles.number} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className={styles.stepText}>
                <h3 className={`heading ${styles.stepTitle}`}>{step.title}</h3>
                <p className={`body ${styles.stepBody}`}>{step.body}</p>
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
