"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./new-event.module.css";

export default function NewEventPage() {
  const router = useRouter();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    capacity: "",
  });

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("milestone_token");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          localStorage.removeItem("milestone_token");
          router.push("/login");
          return;
        }

        const orgRes = await fetch(`/api/orgs/${data.user.org_id}`);
        const orgData = await orgRes.json();
        if (orgRes.ok) {
          setOrg(orgData.org);
        }
      } catch (err) {
        localStorage.removeItem("milestone_token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const token = localStorage.getItem("milestone_token");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/dashboard/events");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
      <h2>New Event</h2>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.newEventContainer}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <label htmlFor="title">Event Title</label>
            <input
              type="text"
              name="title"
              id="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="description">Event Description</label>
            <input
              type="text"
              name="description"
              id="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="location">Event Location</label>
            <input
              type="text"
              name="location"
              id="location"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="date">Event Date</label>
            <input
              type="date"
              name="date"
              id="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="capacity">Event Capacity</label>
            <input
              type="number"
              name="capacity"
              id="capacity"
              value={formData.capacity}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Add Event"}
          </button>
        </form>
      </div>
    </main>
  );
}
