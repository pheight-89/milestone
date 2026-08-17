"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import styles from "./event-detail.module.css";

export default function PublicEventDetailPage({ params }) {
  const { slug, id } = use(params);
  const [org, setOrg] = useState(null);
  const [event, setEvent] = useState(null);
  const [isFamily, setIsFamily] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState([]);
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
        const matchedEvent = eventsRes.ok
          ? eventsData.events.find((e) => e.id === id)
          : null;

        if (!matchedEvent) {
          setError("Event not found");
          return;
        }

        setEvent(matchedEvent);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user.user_type === "family") {
            setIsFamily(true);

            const regsRes = await fetch("/api/family/registrations");
            if (regsRes.ok) {
              const regsData = await regsRes.json();
              setMyRegistrations(
                regsData.registrations.filter((r) => r.event_id === id),
              );
            }
          }
        }
      } catch (err) {
        setError("Failed to load event.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [slug, id]);

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>{error || "Event not found"}</p>
        <Link href={`/${slug}`}>Back to {org?.name || "organization"}</Link>
      </main>
    );
  }

  const date = new Date(event.date);

  return (
    <main className={styles.main}>
      <Link href={`/${slug}`} className={styles.backLink}>
        ← Back to {org?.name}
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>{event.title}</h1>
        {event.description && (
          <p className={styles.description}>{event.description}</p>
        )}

        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Date</span>
            <span>{date.toLocaleDateString()}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Time</span>
            <span>
              {date.toLocaleTimeString([], {
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
            <span className={styles.label}>Cost</span>
            <span>{event.cost ? `$${event.cost}` : "Free"}</span>
          </div>
        </div>

        <p className={styles.capacity}>
          {event.registered_count} of {event.capacity} spots filled
        </p>

        {myRegistrations.length > 0 && (
          <div className={styles.myRegistrations}>
            <h2>Your Registrations</h2>
            {myRegistrations.map((reg) => (
              <p key={reg.id} className={styles.registrationRow}>
                {reg.client_first_name} {reg.client_last_name} —{" "}
                <span className={styles.statusBadge}>{reg.status}</span>
              </p>
            ))}
          </div>
        )}

        {isFamily ? (
          <Link
            href={`/${slug}/events/${id}/register`}
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
    </main>
  );
}
