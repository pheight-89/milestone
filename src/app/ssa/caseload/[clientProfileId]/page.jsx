"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { splitSpanByFiscalYear } from "@/lib/fiscalYear";
import styles from "./client-profile.module.css";
import dashStyles from "../../dashboard/ssa-dashboard.module.css";

function toDateOnly(value) {
  return new Date(value).toISOString().split("T")[0];
}

function registrationsInPeriod(registrations, period) {
  const periodStart = toDateOnly(period.start);
  const periodEnd = toDateOnly(period.end);

  return registrations.filter((reg) => {
    if (!reg.event_date) return false;
    const eventDate = toDateOnly(reg.event_date);
    return eventDate >= periodStart && eventDate <= periodEnd;
  });
}

function buildProfileForm(profile) {
  return {
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    date_of_birth: profile.date_of_birth || "",
    primary_phone: profile.primary_phone || "",
    emergency_contact_name: profile.emergency_contact_name || "",
    emergency_contact_phone: profile.emergency_contact_phone || "",
    emergency_contact_relationship: profile.emergency_contact_relationship || "",
    support_needs: profile.support_needs || "",
    allergies: profile.allergies || "",
    notes: profile.notes || "",
  };
}

export default function SsaClientProfilePage({ params }) {
  const { clientProfileId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [caseloadEntries, setCaseloadEntries] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const [showAddSpan, setShowAddSpan] = useState(false);
  const [addSpanStart, setAddSpanStart] = useState("");
  const [addSpanEnd, setAddSpanEnd] = useState("");
  const [addingSpan, setAddingSpan] = useState(false);
  const [addSpanError, setAddSpanError] = useState(null);

  const [editingSpanId, setEditingSpanId] = useState(null);
  const [editSpanStart, setEditSpanStart] = useState("");
  const [editSpanEnd, setEditSpanEnd] = useState("");
  const [savingSpanEdit, setSavingSpanEdit] = useState(false);
  const [spanEditError, setSpanEditError] = useState(null);
  const [deletingSpanId, setDeletingSpanId] = useState(null);
  const [spanListError, setSpanListError] = useState(null);

  const [expandedRegIds, setExpandedRegIds] = useState(new Set());

  function toggleExpanded(regId) {
    setExpandedRegIds((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) {
        next.delete(regId);
      } else {
        next.add(regId);
      }
      return next;
    });
  }

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (
          !meRes.ok ||
          meData.user.user_type !== "staff" ||
          meData.user.role !== "ssa"
        ) {
          router.push("/login");
          return;
        }

        const res = await fetch(`/api/ssa/caseload/${clientProfileId}/profile`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error);
          return;
        }

        setProfile(data.profile);
        setCaseloadEntries(data.caseload);
        setRegistrations(data.registrations);
        setProfileForm(buildProfileForm(data.profile));
      } catch (err) {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [clientProfileId, router]);

  function toggleEditProfile() {
    if (!editingProfile) {
      setProfileForm(buildProfileForm(profile));
      setProfileError(null);
    }
    setEditingProfile((prev) => !prev);
  }

  function handleProfileChange(e) {
    setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);

    try {
      const res = await fetch(`/api/ssa/caseload/${clientProfileId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.error);
        return;
      }

      setProfile(data.profile);
      setEditingProfile(false);
    } catch (err) {
      setProfileError("Failed to save changes.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddSpan(e) {
    e.preventDefault();
    setAddSpanError(null);
    setAddingSpan(true);

    try {
      const res = await fetch("/api/ssa/caseload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_profile_id: clientProfileId,
          span_start: addSpanStart,
          span_end: addSpanEnd,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddSpanError(data.error);
        return;
      }

      setCaseloadEntries((prev) => [...prev, data.caseload]);
      setShowAddSpan(false);
      setAddSpanStart("");
      setAddSpanEnd("");
    } catch (err) {
      setAddSpanError("Something went wrong. Please try again.");
    } finally {
      setAddingSpan(false);
    }
  }

  function startEditSpan(entry) {
    setEditingSpanId(entry.id);
    setEditSpanStart(entry.span_start ? entry.span_start.split("T")[0] : "");
    setEditSpanEnd(entry.span_end ? entry.span_end.split("T")[0] : "");
    setSpanEditError(null);
  }

  async function handleSaveSpanEdit(entryId) {
    setSavingSpanEdit(true);
    setSpanEditError(null);

    try {
      const res = await fetch(`/api/ssa/caseload/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          span_start: editSpanStart,
          span_end: editSpanEnd,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSpanEditError(data.error);
        return;
      }

      setCaseloadEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                span_start: data.caseload.span_start,
                span_end: data.caseload.span_end,
              }
            : entry,
        ),
      );
      setEditingSpanId(null);
    } catch (err) {
      setSpanEditError("Failed to save changes.");
    } finally {
      setSavingSpanEdit(false);
    }
  }

  async function handleDeleteSpan(entryId) {
    if (!confirm("Remove this span year?")) return;

    setSpanListError(null);
    setDeletingSpanId(entryId);

    try {
      const res = await fetch(`/api/ssa/caseload/${entryId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setSpanListError(data.error);
        return;
      }

      setCaseloadEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      setSpanListError("Failed to remove span year.");
    } finally {
      setDeletingSpanId(null);
    }
  }

  function renderRegistrationRow(reg) {
    const expanded = expandedRegIds.has(reg.id);
    const hasBilling = reg.billing_codes && reg.billing_codes.length > 0;

    return (
      <div key={reg.id} className={dashStyles.regRow}>
        <button
          type="button"
          className={dashStyles.regRowHeader}
          onClick={() => toggleExpanded(reg.id)}
        >
          <span>{reg.event_title}</span>
          <span>{expanded ? "▲" : "▼"}</span>
        </button>
        {expanded && (
          <div className={dashStyles.regRowDetail}>
            <p>Event: {reg.event_title}</p>
            <p>Org: {reg.org_name}</p>
            <p>
              Date:{" "}
              {reg.event_date
                ? new Date(reg.event_date).toLocaleDateString()
                : "—"}
            </p>
            <p>
              Status: {reg.status} |{" "}
              {reg.payment_type === "self_pay" ? "Self Pay" : "Funded"}
            </p>

            {hasBilling ? (
              <div className={dashStyles.billingBreakdown}>
                <p className={dashStyles.billingLabel}>Billing:</p>
                {reg.billing_codes.map((code) => (
                  <p key={code.code} className={dashStyles.billingLine}>
                    {code.code} — {code.description}
                    {code.is_addon ? " (add-on)" : ""}: $
                    {Number(code.rate).toFixed(2)}
                  </p>
                ))}
                <p className={dashStyles.billingTotal}>
                  Event Total: ${Number(reg.billing_total).toFixed(2)}
                </p>
              </div>
            ) : (
              <p className={dashStyles.selfPayLine}>
                Self Pay: ${Number(reg.event_cost || 0).toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderPane(label, regs) {
    const billedRegs = regs.filter(
      (reg) => reg.billing_codes && reg.billing_codes.length > 0,
    );
    const paneTotal = billedRegs.reduce(
      (sum, reg) => sum + Number(reg.billing_total),
      0,
    );

    const totalsByOrg = new Map();
    for (const reg of billedRegs) {
      totalsByOrg.set(
        reg.org_name,
        (totalsByOrg.get(reg.org_name) || 0) + Number(reg.billing_total),
      );
    }

    return (
      <div className={dashStyles.pane}>
        <h5>
          {label} ({regs.length})
        </h5>
        {regs.length === 0 ? (
          <p className={styles.emptyState}>None.</p>
        ) : (
          <div className={dashStyles.paneRegList}>
            {regs.map((reg) => renderRegistrationRow(reg))}
          </div>
        )}
        {totalsByOrg.size > 0 && (
          <div className={dashStyles.orgTotals}>
            {[...totalsByOrg.entries()].map(([orgName, total]) => (
              <p key={orgName} className={dashStyles.orgTotal}>
                {orgName} Total: ${total.toFixed(2)}
              </p>
            ))}
          </div>
        )}
        <p className={dashStyles.paneTotal}>
          {label} Total: ${paneTotal.toFixed(2)}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>
          Profile not found or you do not have access.
        </p>
        <Link href="/ssa/dashboard">← Back to Caseload</Link>
      </main>
    );
  }

  // Fiscal periods are computed across the individual's full engagement —
  // the earliest span start through the latest span end — so multiple span
  // years produce one clean set of periods instead of overlapping ones.
  const spanRange = caseloadEntries.reduce(
    (range, entry) => {
      const start = new Date(entry.span_start);
      const end = new Date(entry.span_end);
      return {
        start: !range.start || start < range.start ? start : range.start,
        end: !range.end || end > range.end ? end : range.end,
      };
    },
    { start: null, end: null },
  );

  const periods =
    spanRange.start && spanRange.end
      ? splitSpanByFiscalYear(spanRange.start, spanRange.end)
      : [];

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <Link href="/ssa/dashboard" className={styles.backLink}>
          ← Back to Caseload
        </Link>
        <h1 className={styles.title}>
          {profile.first_name} {profile.last_name}
        </h1>
        <p className={styles.subtitle}>
          DOB:{" "}
          {profile.date_of_birth
            ? new Date(profile.date_of_birth).toLocaleDateString()
            : "—"}
        </p>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Profile Information</h2>
            <button
              type="button"
              className={styles.editButton}
              onClick={toggleEditProfile}
            >
              {editingProfile ? "Cancel" : "Edit"}
            </button>
          </div>

          {editingProfile ? (
            <form onSubmit={handleSaveProfile} className={styles.form}>
              {profileError && (
                <div className={styles.errorBanner}>{profileError}</div>
              )}

              <div className={styles.formField}>
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={profileForm.first_name}
                  onChange={handleProfileChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={profileForm.last_name}
                  onChange={handleProfileChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="date_of_birth">Date of Birth</label>
                <input
                  type="date"
                  id="date_of_birth"
                  name="date_of_birth"
                  value={profileForm.date_of_birth}
                  onChange={handleProfileChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="primary_phone">Primary Phone</label>
                <input
                  type="tel"
                  id="primary_phone"
                  name="primary_phone"
                  value={profileForm.primary_phone}
                  onChange={handleProfileChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="emergency_contact_name">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={profileForm.emergency_contact_name}
                  onChange={handleProfileChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="emergency_contact_phone">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  value={profileForm.emergency_contact_phone}
                  onChange={handleProfileChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="emergency_contact_relationship">
                  Emergency Contact Relationship
                </label>
                <input
                  type="text"
                  id="emergency_contact_relationship"
                  name="emergency_contact_relationship"
                  value={profileForm.emergency_contact_relationship}
                  onChange={handleProfileChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="support_needs">Support Needs</label>
                <textarea
                  id="support_needs"
                  name="support_needs"
                  rows={3}
                  value={profileForm.support_needs}
                  onChange={handleProfileChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="allergies">Allergies</label>
                <textarea
                  id="allergies"
                  name="allergies"
                  rows={3}
                  value={profileForm.allergies}
                  onChange={handleProfileChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={profileForm.notes}
                  onChange={handleProfileChange}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>First Name</span>
                  <span>{profile.first_name || "—"}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Last Name</span>
                  <span>{profile.last_name || "—"}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Date of Birth</span>
                  <span>
                    {profile.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Primary Phone</span>
                  <span>{profile.primary_phone || "—"}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Emergency Contact</span>
                  <span>
                    {profile.emergency_contact_name || "—"}
                    {profile.emergency_contact_relationship &&
                      ` (${profile.emergency_contact_relationship})`}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Emergency Phone</span>
                  <span>{profile.emergency_contact_phone || "—"}</span>
                </div>
              </div>
              {profile.support_needs && (
                <p className={styles.description}>
                  <strong>Support Needs:</strong> {profile.support_needs}
                </p>
              )}
              {profile.allergies && (
                <p className={styles.description}>
                  <strong>Allergies:</strong> {profile.allergies}
                </p>
              )}
              {profile.notes && (
                <p className={styles.description}>
                  <strong>Notes:</strong> {profile.notes}
                </p>
              )}
            </>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Span Years</h2>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setShowAddSpan((prev) => !prev)}
            >
              {showAddSpan ? "Cancel" : "+ Add"}
            </button>
          </div>

          {spanListError && (
            <div className={styles.errorBanner}>{spanListError}</div>
          )}

          {caseloadEntries.length === 0 ? (
            <p className={styles.emptyState}>No span years yet.</p>
          ) : (
            <div className={styles.spanList}>
              {caseloadEntries.map((entry) =>
                editingSpanId === entry.id ? (
                  <div key={entry.id} className={styles.editSpanRow}>
                    {spanEditError && (
                      <div className={styles.errorBanner}>{spanEditError}</div>
                    )}
                    <label>
                      Span Start
                      <input
                        type="date"
                        value={editSpanStart}
                        onChange={(e) => setEditSpanStart(e.target.value)}
                      />
                    </label>
                    <label>
                      Span End
                      <input
                        type="date"
                        value={editSpanEnd}
                        onChange={(e) => setEditSpanEnd(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveSpanEdit(entry.id)}
                      disabled={savingSpanEdit}
                    >
                      {savingSpanEdit ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSpanId(null)}
                      disabled={savingSpanEdit}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div key={entry.id} className={styles.spanRow}>
                    <span>
                      {new Date(entry.span_start).toLocaleDateString()} -{" "}
                      {new Date(entry.span_end).toLocaleDateString()}
                    </span>
                    <div className={styles.spanRowActions}>
                      <button
                        type="button"
                        onClick={() => startEditSpan(entry)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDeleteSpan(entry.id)}
                        disabled={deletingSpanId === entry.id}
                      >
                        {deletingSpanId === entry.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {showAddSpan && (
            <form onSubmit={handleAddSpan} className={styles.addSpanForm}>
              {addSpanError && (
                <div className={styles.errorBanner}>{addSpanError}</div>
              )}
              <label>
                Span Start
                <input
                  type="date"
                  value={addSpanStart}
                  onChange={(e) => setAddSpanStart(e.target.value)}
                  required
                />
              </label>
              <label>
                Span End
                <input
                  type="date"
                  value={addSpanEnd}
                  onChange={(e) => setAddSpanEnd(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={addingSpan}>
                {addingSpan ? "Adding..." : "Add Span Year"}
              </button>
            </form>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Registrations</h2>
          </div>

          {periods.length === 0 ? (
            <p className={styles.emptyState}>No span years on file yet.</p>
          ) : (
            <div className={dashStyles.periods}>
              {periods.map((period) => {
                const periodRegs = registrationsInPeriod(registrations, period);
                const confirmedRegs = periodRegs.filter(
                  (reg) => reg.status === "confirmed",
                );
                const pendingRegs = periodRegs.filter(
                  (reg) => reg.status === "pending",
                );

                return (
                  <div key={period.label} className={dashStyles.period}>
                    <h4>{period.label}</h4>
                    {periodRegs.length === 0 ? (
                      <p className={styles.emptyState}>
                        No events registered in this period.
                      </p>
                    ) : (
                      <>
                        {renderPane("Confirmed", confirmedRegs)}
                        {renderPane("Pending", pendingRegs)}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Individual Budget</h2>
            <span className={styles.comingSoonTag}>Coming Soon</span>
          </div>
          <p className={styles.comingSoon}>
            Budget planning tools coming soon. This section will allow you to
            create and manage individual budgets directly within Milestone.
          </p>
        </div>
      </div>
    </main>
  );
}
