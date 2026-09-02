"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../event-id.module.css";

export default function MoveRegistrationPage({ params }) {
  const { id, registrationId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [originalEvent, setOriginalEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [eligibleEvents, setEligibleEvents] = useState([]);
  const [paymentType, setPaymentType] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [moveError, setMoveError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventRes, rosterRes, eligibleRes] = await Promise.all([
          fetch(`/api/events/${id}`),
          fetch(`/api/registrations?event_id=${id}`),
          fetch(`/api/registrations/${registrationId}/eligible-events`),
        ]);

        const eventData = await eventRes.json();
        const rosterData = await rosterRes.json();
        const eligibleData = await eligibleRes.json();

        if (!eventRes.ok) {
          setError(eventData.error);
          return;
        }
        setOriginalEvent(eventData.event);

        if (!rosterRes.ok) {
          setError(rosterData.error);
          return;
        }
        const reg = rosterData.registrations.find(
          (r) => r.id === registrationId,
        );
        if (!reg) {
          setError("Registration not found.");
          return;
        }
        setRegistration(reg);

        if (!eligibleRes.ok) {
          setError(eligibleData.error);
          return;
        }
        setEligibleEvents(eligibleData.events);
        setPaymentType(eligibleData.payment_type);
      } catch (err) {
        setError("Failed to load move details.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, registrationId]);

  function selectEvent(eventId) {
    setSelectedEventId(eventId);
    setOverrideReason("");
    setMoveError(null);
  }

  async function handleMove(withOverride) {
    if (!selectedEventId) return;

    setMoveError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/registrations/${registrationId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_event_id: selectedEventId,
          ...(withOverride ? { override_reason: overrideReason } : {}),
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.requires_override) {
        // stale client state — capacity changed since the eligible list
        // loaded. Force the override section open.
        setEligibleEvents((prev) =>
          prev.map((e) =>
            e.id === selectedEventId
              ? { ...e, confirmed_count: data.confirmed_count, capacity: data.capacity }
              : e,
          ),
        );
        return;
      }

      if (!res.ok) {
        setMoveError(data.error || "Failed to move registration.");
        return;
      }

      router.push(`/dashboard/events/${id}`);
    } catch (err) {
      setMoveError("Failed to move registration.");
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

  if (error && !registration) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>{error}</p>
        <Link href={`/dashboard/events/${id}`}>← Back to Event</Link>
      </main>
    );
  }

  const filteredEvents = eligibleEvents.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedEvent =
    eligibleEvents.find((event) => event.id === selectedEventId) || null;
  const selectedAtCapacity =
    selectedEvent && selectedEvent.confirmed_count >= selectedEvent.capacity;

  const sourceCodes = (registration.billing_codes || []).map((c) => c.code);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <Link href={`/dashboard/events/${id}`} className={styles.backLink}>
          ← Back to Event
        </Link>
        <h1 className={styles.title}>Move Registration</h1>
      </div>

      <p className={styles.subject}>
        {registration.first_name} {registration.last_name} →{" "}
        {originalEvent?.title}
      </p>

      {moveError && <div className={styles.errorBanner}>{moveError}</div>}

      <div className={styles.card}>
        <h2>Select Destination Event</h2>

        <p className={styles.helperText}>
          Payment Type:{" "}
          {paymentType === "self_pay"
            ? "Self Pay (any future event)"
            : `Funded (${sourceCodes.length > 0 ? sourceCodes.join(", ") : "matching billing codes"} required)`}
        </p>

        <input
          type="text"
          className={styles.searchInput}
          placeholder="🔍 Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {filteredEvents.length === 0 ? (
          <p className={styles.emptyState}>No eligible events found.</p>
        ) : (
          <div className={styles.eventList}>
            {filteredEvents.map((event) => {
              const atCapacity = event.confirmed_count >= event.capacity;
              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => selectEvent(event.id)}
                  className={
                    event.id === selectedEventId
                      ? `${styles.eventRow} ${styles.eventRowSelected}`
                      : styles.eventRow
                  }
                >
                  <div className={styles.eventRowBody}>
                    <div className={styles.eventRowTitle}>{event.title}</div>
                    <div className={styles.eventRowMeta}>
                      {new Date(event.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {event.location && ` | ${event.location}`}
                    </div>
                    <div className={styles.eventRowMeta}>
                      <span className={atCapacity ? styles.capacityTagOver : styles.capacityTag}>
                        {event.confirmed_count} of {event.capacity} confirmed
                        {atCapacity && " ⚠️ AT CAPACITY"}
                      </span>
                      {paymentType === "funded" && event.billing_codes.length > 0 && (
                        <> | {event.billing_codes.join(", ")}</>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedEvent && !selectedAtCapacity && (
          <div className={styles.selectedEventBox}>
            <p>
              Move to <strong>{selectedEvent.title}</strong> on{" "}
              {new Date(selectedEvent.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              ?
            </p>
            <div className={styles.overrideActions}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => handleMove(false)}
                disabled={submitting}
              >
                {submitting ? "Moving..." : "Move Registration"}
              </button>
            </div>
          </div>
        )}

        {selectedEvent && selectedAtCapacity && (
          <div className={styles.overrideBox}>
            <p>
              ⚠️ {selectedEvent.title} is at capacity (
              {selectedEvent.confirmed_count}/{selectedEvent.capacity}).
              Moving here will bring it to{" "}
              {selectedEvent.confirmed_count + 1}/{selectedEvent.capacity}.
            </p>
            <label htmlFor="overrideReason">Override reason (required):</label>
            <textarea
              id="overrideReason"
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
            <div className={styles.overrideActions}>
              <button
                type="button"
                onClick={() => setSelectedEventId(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.declineButton}
                onClick={() => handleMove(true)}
                disabled={!overrideReason.trim() || submitting}
              >
                {submitting ? "Moving..." : "Move Anyway"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
