"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./event-id.module.css";

export default function EventDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error);
          return;
        }

        setEvent(data.event);
      } catch (err) {
        setError("Failed to load event.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading event...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>{error}</p>
        <Link href="/dashboard/events">Back to Events</Link>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <Link href="/dashboard/events" className={styles.backLink}>
          ← Back to Events
        </Link>
        <h1 className={styles.title}>{event.title}</h1>
      </div>

      <div className={styles.details}>
        <div className={styles.card}>
          <h2>Event Details</h2>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.label}>Date</span>
              <span>{new Date(event.date).toLocaleDateString()}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Time</span>
              <span>
                {new Date(event.date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Location</span>
              <span>{event.location || "TBD"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Capacity</span>
              <span>{event.capacity} seats</span>
            </div>
          </div>
          {event.description && (
            <p className={styles.description}>{event.description}</p>
          )}
        </div>
      </div>
    </main>
  );
}
