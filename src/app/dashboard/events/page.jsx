"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./events.module.css";

export default function DashboardEventPage() {
  const router = useRouter();
  const [org, setOrg] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok) {
          router.push("/login");
          return;
        }

        const eventRes = await fetch("/api/events", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const eventData = await eventRes.json();
        if (eventRes.ok) {
          setEvents(eventData.data);
        }

        const orgRes = await fetch(`/api/orgs/${data.user.org_id}`);
        const orgData = await orgRes.json();
        if (orgRes.ok) {
          setOrg(orgData.org);
        }
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1>{org?.name}</h1>
      <div className={styles.cardsContainer}>
        {events.map((event) => {
          const date = new Date(event.date);
          return (
            <div key={event.id} className={styles.card}>
              <h2>{event.title}</h2>
              <p>{event.description}</p>
              <p>
                {date.toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                })}
              </p>
              <p>Capacity: {event.capacity}</p>
            </div>
          );
        })}
        <Link href="/dashboard/events/new">Add New Event</Link>
        <Link href="/dashboard">Return To Dashboard</Link>
      </div>
    </main>
  );
}
