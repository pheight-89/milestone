import Link from "next/link";
import styles from "./get-started.module.css";

export default function GetStartedPage() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Get Started with Milestone</h1>
        <p className={styles.subtitle}>Choose the account type that fits you.</p>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>I&apos;m an Organization</h2>
          <p className={styles.cardDescription}>
            Set up Milestone for your organization to manage events and
            rosters.
          </p>
          <Link href="/signup" className={styles.cardButton}>
            Get Started
          </Link>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>I&apos;m a Family or Individual</h2>
          <p className={styles.cardDescription}>
            Create an account to browse and sign up for events.
          </p>
          <Link href="/family/signup" className={styles.cardButton}>
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
