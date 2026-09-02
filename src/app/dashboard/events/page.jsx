"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./events.module.css";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthCells(anchor) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstOfMonth.getDay(); i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));

  return cells;
}

function getWeekDays(anchor) {
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - anchor.getDay());

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function DashboardEventPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [calendarView, setCalendarView] = useState("month");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [editingEvent, setEditingEvent] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok) {
          router.push("/login");
          return;
        }

        setUser(data.user);

        const [eventRes, orgRes] = await Promise.all([
          fetch("/api/events"),
          fetch(`/api/orgs/${data.user.org_id}`),
        ]);

        const eventData = await eventRes.json();
        const orgData = await orgRes.json();

        if (eventRes.ok) setEvents(eventData.data);
        if (orgRes.ok) setOrg(orgData.org);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  function openEdit(event) {
    setEditError(null);
    setEditingEvent(event);
    setEditFormData({
      title: event.title || "",
      description: event.description || "",
      location: event.location || "",
      date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
      capacity: event.capacity || "",
      cost: event.cost || 0,
    });
  }

  function closeEdit() {
    setEditingEvent(null);
    setEditFormData(null);
    setEditError(null);
  }

  function handleEditChange(e) {
    setEditFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          capacity: parseInt(editFormData.capacity),
          cost: parseFloat(editFormData.cost) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error);
        return;
      }

      setEvents((prev) =>
        prev.map((event) => (event.id === data.data.id ? data.data : event)),
      );
      closeEdit();
    } catch (err) {
      setEditError("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(event) {
    if (
      !confirm(
        `Are you sure you want to delete "${event.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleteError(null);
    setDeletingId(event.id);

    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error);
        return;
      }

      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err) {
      setDeleteError("Failed to delete event.");
    } finally {
      setDeletingId(null);
    }
  }

  function goToPrevious() {
    setCalendarDate((prev) => {
      if (calendarView === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      }
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function goToNext() {
    setCalendarDate((prev) => {
      if (calendarView === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      }
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  const isAdmin = user?.role === "admin";
  const todayKey = dateKey(new Date());

  const eventsByDate = new Map();
  for (const event of events) {
    const key = dateKey(new Date(event.date));
    const list = eventsByDate.get(key) || [];
    list.push(event);
    eventsByDate.set(key, list);
  }

  const monthCells = getMonthCells(calendarDate);
  const weekDays = getWeekDays(calendarDate);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>{org?.name}</h1>
        <Link href="/dashboard/events/new" className={styles.addEventButton}>
          Add New Event
        </Link>
      </div>

      {deleteError && <div className={styles.errorBanner}>{deleteError}</div>}

      <div className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <div className={styles.calendarNav}>
            <button type="button" onClick={goToPrevious} aria-label="Previous">
              ‹
            </button>
            <span className={styles.calendarLabel}>
              {calendarView === "month"
                ? calendarDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </span>
            <button type="button" onClick={goToNext} aria-label="Next">
              ›
            </button>
          </div>
          <div className={styles.calendarToggle}>
            <button
              type="button"
              onClick={() => setCalendarView("month")}
              className={calendarView === "month" ? styles.active : ""}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("week")}
              className={calendarView === "week" ? styles.active : ""}
            >
              Week
            </button>
          </div>
        </div>

        {calendarView === "month" ? (
          <div className={styles.monthGrid}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className={styles.weekdayHeader}>
                {label}
              </div>
            ))}
            {monthCells.map((cellDate, i) => {
              if (!cellDate) {
                return <div key={`blank-${i}`} className={styles.dayCellEmpty} />;
              }
              const key = dateKey(cellDate);
              const dayEvents = eventsByDate.get(key) || [];
              const isToday = key === todayKey;

              return (
                <div
                  key={key}
                  className={
                    isToday
                      ? `${styles.dayCell} ${styles.dayCellToday}`
                      : styles.dayCell
                  }
                >
                  <span className={styles.dayNumber}>{cellDate.getDate()}</span>
                  <div className={styles.dayChips}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        className={styles.eventChip}
                        onClick={() => router.push(`/dashboard/events/${event.id}`)}
                        title={event.title}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className={styles.moreChip}>
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.weekGrid}>
            {weekDays.map((day) => {
              const key = dateKey(day);
              const dayEvents = eventsByDate.get(key) || [];
              const isToday = key === todayKey;

              return (
                <div
                  key={key}
                  className={
                    isToday
                      ? `${styles.weekColumn} ${styles.dayCellToday}`
                      : styles.weekColumn
                  }
                >
                  <div className={styles.weekColumnHeader}>
                    {day.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  {dayEvents.length === 0 ? (
                    <p className={styles.weekEmptyState}>No events</p>
                  ) : (
                    dayEvents.map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        className={styles.weekEventCard}
                        onClick={() => router.push(`/dashboard/events/${event.id}`)}
                      >
                        <div className={styles.weekEventTitle}>{event.title}</div>
                        <div className={styles.weekEventMeta}>
                          {event.location || "TBD"} · Cap {event.capacity}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.listSection}>
        <h2 className={styles.listHeading}>All Events</h2>
        {events.length === 0 ? (
          <p className={styles.emptyState}>No events yet.</p>
        ) : (
          <div className={styles.cardsContainer}>
            {events.map((event) => {
              const date = new Date(event.date);
              return (
                <div className={styles.card} key={event.id}>
                  <h3>{event.title}</h3>
                  <p className={styles.cardMeta}>
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {event.location && ` | ${event.location}`}
                  </p>
                  <p className={styles.cardMeta}>
                    Capacity: {event.capacity} | Cost:{" "}
                    {Number(event.cost)
                      ? `$${Number(event.cost).toFixed(2)}`
                      : "Free"}
                  </p>
                  <div className={styles.cardActions}>
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className={styles.viewButton}
                    >
                      View Details
                    </Link>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => openEdit(event)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => handleDelete(event)}
                          disabled={deletingId === event.id}
                        >
                          {deletingId === event.id ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingEvent && (
        <div className={styles.overlay} onClick={closeEdit}>
          <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
            <h2>Edit Event</h2>
            {editError && <div className={styles.errorBanner}>{editError}</div>}
            <form onSubmit={handleSaveEdit} className={styles.editForm}>
              <div className={styles.formField}>
                <label htmlFor="edit-title">Event Title</label>
                <input
                  type="text"
                  id="edit-title"
                  name="title"
                  value={editFormData.title}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditChange}
                  rows={3}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="edit-location">Location</label>
                <input
                  type="text"
                  id="edit-location"
                  name="location"
                  value={editFormData.location}
                  onChange={handleEditChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="edit-date">Date</label>
                <input
                  type="date"
                  id="edit-date"
                  name="date"
                  value={editFormData.date}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="edit-capacity">Capacity</label>
                <input
                  type="number"
                  id="edit-capacity"
                  name="capacity"
                  value={editFormData.capacity}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="edit-cost">Event Cost ($)</label>
                <input
                  type="number"
                  id="edit-cost"
                  name="cost"
                  value={editFormData.cost}
                  onChange={handleEditChange}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className={styles.editFormActions}>
                <button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={closeEdit} disabled={savingEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
