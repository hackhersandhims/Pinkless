import styles from './Hero.module.css';

export type HeroProps = Record<string, never>;

/** Home-page hero. No CTA button: no CTA color token exists yet — see module CSS. */
export function Hero(_props: HeroProps) {
  return (
    <section className={styles.hero}>
      <h1 className={`display ${styles.headline}`}>WOMEN PAY MORE FOR THE SAME PRODUCT.</h1>
      <p className={`body ${styles.sub}`}>Reviewed product comparisons, right where you shop.</p>
    </section>
  );
}
