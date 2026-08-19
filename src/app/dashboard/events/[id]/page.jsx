"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchableSelect from "@/components/SearchableSelect";
import styles from "./event-id.module.css";

export default function EventDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState(null);
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
    cost: "",
  });
  const [registrations, setRegistrations] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [rosterError, setRosterError] = useState(null);

  const [eventBillingCodes, setEventBillingCodes] = useState([]);
  const [availableBillingCodes, setAvailableBillingCodes] = useState([]);
  const [loadingBillingCodes, setLoadingBillingCodes] = useState(true);
  const [billingCodesError, setBillingCodesError] = useState(null);
  const [selectedBillingCode, setSelectedBillingCode] = useState(null);
  const [newCodeIsAddon, setNewCodeIsAddon] = useState(false);
  const [addingBillingCode, setAddingBillingCode] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (!meRes.ok) {
          router.push("/login");
          return;
        }

        setUser(meData.user);

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
          cost: data.event.cost || 0,
        });
      } catch (err) {
        setError("Failed to load event.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  useEffect(() => {
    async function fetchRoster() {
      try {
        const res = await fetch(`/api/registrations?event_id=${id}`);
        const data = await res.json();

        if (!res.ok) {
          setRosterError(data.error);
          return;
        }

        setRegistrations(data.registrations);
      } catch (err) {
        setRosterError("Failed to load roster.");
      } finally {
        setLoadingRoster(false);
      }
    }

    fetchRoster();
  }, [id]);

  useEffect(() => {
    async function fetchBillingCodes() {
      if (!user || user.org_type !== "provider") {
        setLoadingBillingCodes(false);
        return;
      }

      try {
        const [linkedRes, availableRes] = await Promise.all([
          fetch(`/api/events/${id}/billing-codes`),
          fetch("/api/billing-codes"),
        ]);

        const linkedData = await linkedRes.json();
        if (linkedRes.ok) {
          setEventBillingCodes(linkedData.codes);
        } else {
          setBillingCodesError(linkedData.error);
        }

        const availableData = await availableRes.json();
        if (availableRes.ok) {
          setAvailableBillingCodes(
            availableData.codes.map((code) => ({
              id: code.code,
              label: `${code.code} — ${code.description} ($${Number(code.rate).toFixed(2)})`,
            })),
          );
        }
      } catch (err) {
        setBillingCodesError("Failed to load billing codes.");
      } finally {
        setLoadingBillingCodes(false);
      }
    }

    fetchBillingCodes();
  }, [id, user]);

  async function handleAddBillingCode() {
    if (!selectedBillingCode) return;

    setBillingCodesError(null);
    setAddingBillingCode(true);

    try {
      const res = await fetch(`/api/events/${id}/billing-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedBillingCode.id,
          is_addon: newCodeIsAddon,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBillingCodesError(data.error);
        return;
      }

      const linkedRes = await fetch(`/api/events/${id}/billing-codes`);
      const linkedData = await linkedRes.json();
      if (linkedRes.ok) setEventBillingCodes(linkedData.codes);

      setSelectedBillingCode(null);
      setNewCodeIsAddon(false);
    } catch (err) {
      setBillingCodesError("Something went wrong. Please try again.");
    } finally {
      setAddingBillingCode(false);
    }
  }

  async function handleRemoveBillingCode(codeId) {
    setBillingCodesError(null);

    try {
      const res = await fetch(
        `/api/events/${id}/billing-codes/${codeId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const data = await res.json();
        setBillingCodesError(data.error);
        return;
      }

      setEventBillingCodes((prev) => prev.filter((c) => c.id !== codeId));
    } catch (err) {
      setBillingCodesError("Failed to remove billing code.");
    }
  }

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
          cost: parseFloat(formData.cost) || 0,
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
          {user?.role === "admin" && (
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
          )}
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

              <div className={styles.formField}>
                <label htmlFor="cost">Event Cost ($)</label>
                <input
                  type="number"
                  id="cost"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                {eventBillingCodes.length > 0 && (
                  <p className={styles.helperText}>
                    Private pay price (minimum: $
                    {eventBillingCodes
                      .reduce((sum, c) => sum + Number(c.rate), 0)
                      .toFixed(2)}{" "}
                    based on billing codes)
                  </p>
                )}
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
              <div className={styles.detailItem}>
                <span className={styles.label}>Cost</span>
                <span>
                  {Number(event.cost)
                    ? `$${Number(event.cost).toFixed(2)}`
                    : "Free"}
                </span>
              </div>
            </div>
            {event.description && (
              <p className={styles.description}>{event.description}</p>
            )}
          </div>
        )}
      </div>

      {user?.org_type === "provider" && (
        <div className={styles.rosterSection}>
          <div className={styles.card}>
            <h2>Billing Codes</h2>

            {billingCodesError && (
              <div className={styles.errorBanner}>{billingCodesError}</div>
            )}

            {loadingBillingCodes ? (
              <p className={styles.loading}>Loading billing codes...</p>
            ) : eventBillingCodes.length === 0 ? (
              <p className={styles.emptyState}>
                No billing codes linked. Add one below.
              </p>
            ) : (
              <table className={styles.rosterTable}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Rate</th>
                    <th>Type</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {eventBillingCodes.map((code) => (
                    <tr key={code.id}>
                      <td>{code.code}</td>
                      <td>{code.description || "—"}</td>
                      <td>${Number(code.rate).toFixed(2)}</td>
                      <td>
                        {code.is_addon && (
                          <span className={styles.addonBadge}>Add-on</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemoveBillingCode(code.id)}
                          className={styles.removeCodeButton}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {eventBillingCodes.length > 0 && (
              <p className={styles.fundedTotal}>
                Total funded cost: $
                {eventBillingCodes
                  .reduce((sum, c) => sum + Number(c.rate), 0)
                  .toFixed(2)}
                <br />
                <span className={styles.helperText}>
                  Private pay price must be at least this amount
                </span>
              </p>
            )}

            <div className={styles.inlineForm}>
              <h3>Add Billing Code</h3>
              <div className={styles.formRow}>
                <SearchableSelect
                  items={availableBillingCodes}
                  onSelect={setSelectedBillingCode}
                  selected={selectedBillingCode}
                  placeholder="Search billing codes..."
                />
                <label className={styles.addonCheckbox}>
                  <input
                    type="checkbox"
                    checked={newCodeIsAddon}
                    onChange={(e) => setNewCodeIsAddon(e.target.checked)}
                  />
                  Add-on
                </label>
                {selectedBillingCode && (
                  <button
                    type="button"
                    onClick={handleAddBillingCode}
                    disabled={addingBillingCode}
                  >
                    {addingBillingCode ? "Adding..." : "Add"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.rosterSection}>
        <div className={styles.card}>
          <h2>Roster</h2>

          {loadingRoster ? (
            <p className={styles.loading}>Loading roster...</p>
          ) : rosterError ? (
            <div className={styles.errorBanner}>{rosterError}</div>
          ) : (
            <>
              <p
                className={
                  registrations.length > event.capacity
                    ? styles.capacityBarOver
                    : styles.capacityBar
                }
              >
                {registrations.length} registered / {event.capacity} capacity
                {registrations.length > event.capacity &&
                  " — over capacity"}
              </p>

              {registrations.length === 0 ? (
                <p className={styles.emptyState}>No registrations yet.</p>
              ) : (
                <table className={styles.rosterTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Support Needs</th>
                      <th>Status</th>
                      <th>Payment Type</th>
                      <th>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr key={reg.id}>
                        <td>
                          {reg.first_name} {reg.last_name}
                        </td>
                        <td>{reg.support_needs || "—"}</td>
                        <td>
                          <span className={styles.statusBadge}>
                            {reg.status}
                          </span>
                        </td>
                        <td>
                          {reg.payment_type === "self_pay" ? (
                            <span className={styles.selfPayBadge}>
                              Self Pay
                            </span>
                          ) : (
                            "Funded"
                          )}
                        </td>
                        <td>
                          {new Date(reg.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
