import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Milestone</h1>
        <p className={styles.tagline}>
          Event registration and roster management for developmental disability
          service organizations.
        </p>
        <div className={styles.actions}>
          <Link href="/get-started" className={styles.primaryButton}>
            Get Started
          </Link>
          <Link href="/login" className={styles.primaryButton}>
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
