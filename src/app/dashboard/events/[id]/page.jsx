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
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    capacity: "",
  });

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

        setFormData({
          title: data.event.title || "",
          description: data.event.description || "",
          location: data.event.location || "",
          date: data.event.date
            ? new Date(data.event.date).toISOString().split("T")[0]
            : "",
          capacity: data.event.capacity || "",
        });
      } catch (err) {
        setError("Failed to load event.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

      setEvent(data.data);
      setEditing(false);
    } catch (err) {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete this event? This cannot be undone.",
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      router.push("/dashboard/events");
    } catch (err) {
      setError("Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading event...</p>
      </main>
    );
  }

  if (error && !event) {
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
        <div className={styles.headerActions}>
          <h1 className={styles.title}>{event.title}</h1>
          <div className={styles.actions}>
            <button
              onClick={() => setEditing(!editing)}
              className={styles.editButton}
            >
              {editing ? "Cancel" : "Edit Event"}
            </button>
            <button
              onClick={handleDelete}
              className={styles.deleteButton}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Event"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.details}>
        {editing ? (
          <div className={styles.card}>
            <h2>Edit Event</h2>
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formField}>
                <label htmlFor="title">Event Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="capacity">Capacity</label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
}
