"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import styles from "./org-landing.module.css";

export default function PublicOrgPage({ params }) {
  const { slug } = use(params);
  const [org, setOrg] = useState(null);
  const [events, setEvents] = useState([]);
  const [isFamily, setIsFamily] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const [orgRes, eventsRes, meRes] = await Promise.all([
          fetch(`/api/public/orgs/${slug}`),
          fetch(`/api/public/orgs/${slug}/events`),
          fetch("/api/auth/me"),
        ]);

        const orgData = await orgRes.json();

        if (!orgRes.ok) {
          setError(orgData.error);
          return;
        }

        setOrg(orgData.org);

        const eventsData = await eventsRes.json();
        if (eventsRes.ok) setEvents(eventsData.events);

        if (meRes.ok) {
          const meData = await meRes.json();
          setIsFamily(meData.user.user_type === "family");
        }
      } catch (err) {
        setError("Failed to load organization.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [slug]);

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>{error}</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>{org.name}</h1>
        <p className={styles.subtitle}>Upcoming Events</p>
      </div>

      {events.length === 0 ? (
        <p className={styles.emptyState}>No upcoming events.</p>
      ) : (
        <div className={styles.eventsList}>
          {events.map((event) => {
            const date = new Date(event.date);
            return (
              <div key={event.id} className={styles.eventCard}>
                <Link
                  href={`/${slug}/events/${event.id}`}
                  className={styles.eventTitleLink}
                >
                  <h2>{event.title}</h2>
                </Link>
                <p>{date.toLocaleString()}</p>
                <p>{event.location || "TBD"}</p>
                <p>
                  {event.registered_count} / {event.capacity} registered
                </p>
                <p>{event.cost ? `$${event.cost}` : "Free"}</p>
                {isFamily ? (
                  <Link
                    href={`/${slug}/events/${event.id}/register`}
                    className={styles.registerButton}
                  >
                    Register
                  </Link>
                ) : (
                  <Link href="/login" className={styles.registerButton}>
                    Sign In to Register
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
