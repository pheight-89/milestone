"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { splitSpanByFiscalYear } from "@/lib/fiscalYear";
import styles from "./ssa-dashboard.module.css";

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

export default function SsaDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [caseload, setCaseload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editSpanStart, setEditSpanStart] = useState("");
  const [editSpanEnd, setEditSpanEnd] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  const [showAddIndividual, setShowAddIndividual] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [addSpanStart, setAddSpanStart] = useState("");
  const [addSpanEnd, setAddSpanEnd] = useState("");
  const [addingIndividual, setAddingIndividual] = useState(false);
  const [addError, setAddError] = useState(null);

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

  async function loadCaseload() {
    const res = await fetch("/api/ssa/caseload");
    const data = await res.json();
    if (res.ok) {
      setCaseload(data.caseload);
    } else {
      setError(data.error);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok || data.user.user_type !== "staff" || data.user.role !== "ssa") {
          router.push("/login");
          return;
        }

        setUser(data.user);

        const orgRes = await fetch(`/api/orgs/${data.user.org_id}`);
        const orgData = await orgRes.json();
        if (orgRes.ok) setOrgName(orgData.org.name);

        await loadCaseload();
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditSpanStart(entry.span_start ? entry.span_start.split("T")[0] : "");
    setEditSpanEnd(entry.span_end ? entry.span_end.split("T")[0] : "");
    setEditError(null);
  }

  async function handleSaveEdit(entryId) {
    setSavingEdit(true);
    setEditError(null);

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
        setEditError(data.error);
        return;
      }

      setCaseload((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, span_start: data.caseload.span_start, span_end: data.caseload.span_end }
            : entry,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setEditError("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    setAddError(null);
    setSelectedClient(null);

    try {
      const res = await fetch(
        `/api/ssa/search-clients?q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await res.json();

      if (res.ok) {
        setSearchResults(data.clients);
      } else {
        setAddError(data.error);
      }
    } catch (err) {
      setAddError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleAddIndividual(e) {
    e.preventDefault();
    setAddError(null);
    setAddingIndividual(true);

    try {
      const res = await fetch("/api/ssa/caseload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_profile_id: selectedClient.id,
          span_start: addSpanStart,
          span_end: addSpanEnd,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error);
        return;
      }

      await loadCaseload();
      setShowAddIndividual(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedClient(null);
      setAddSpanStart("");
      setAddSpanEnd("");
    } catch (err) {
      setAddError("Something went wrong. Please try again.");
    } finally {
      setAddingIndividual(false);
    }
  }

  function renderRegistrationRow(reg) {
    const expanded = expandedRegIds.has(reg.id);
    const hasBilling = reg.billing_codes && reg.billing_codes.length > 0;

    return (
      <div key={reg.id} className={styles.regRow}>
        <button
          type="button"
          className={styles.regRowHeader}
          onClick={() => toggleExpanded(reg.id)}
        >
          <span>{reg.event_title}</span>
          <span>{expanded ? "▲" : "▼"}</span>
        </button>
        {expanded && (
          <div className={styles.regRowDetail}>
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
              <div className={styles.billingBreakdown}>
                <p className={styles.billingLabel}>Billing:</p>
                {reg.billing_codes.map((code) => (
                  <p key={code.code} className={styles.billingLine}>
                    {code.code} — {code.description}
                    {code.is_addon ? " (add-on)" : ""}: $
                    {Number(code.rate).toFixed(2)}
                  </p>
                ))}
                <p className={styles.billingTotal}>
                  Event Total: ${Number(reg.billing_total).toFixed(2)}
                </p>
              </div>
            ) : (
              <p className={styles.selfPayLine}>
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
      <div className={styles.pane}>
        <h5>
          {label} ({regs.length})
        </h5>
        {regs.length === 0 ? (
          <p className={styles.emptyState}>None.</p>
        ) : (
          <div className={styles.paneRegList}>
            {regs.map((reg) => renderRegistrationRow(reg))}
          </div>
        )}
        {totalsByOrg.size > 0 && (
          <div className={styles.orgTotals}>
            {[...totalsByOrg.entries()].map(([orgName, total]) => (
              <p key={orgName} className={styles.orgTotal}>
                {orgName} Total: ${total.toFixed(2)}
              </p>
            ))}
          </div>
        )}
        <p className={styles.paneTotal}>
          {label} Total: ${paneTotal.toFixed(2)}
        </p>
      </div>
    );
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
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{user?.email}</h1>
          <p className={styles.subtitle}>{orgName}</p>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Caseload</h2>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setShowAddIndividual((prev) => !prev)}
          >
            {showAddIndividual ? "Cancel" : "Add Individual"}
          </button>
        </div>

        {showAddIndividual && (
          <div className={styles.addIndividualPanel}>
            {addError && <div className={styles.errorBanner}>{addError}</div>}

            <form onSubmit={handleSearch} className={styles.searchRow}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name"
                required
              />
              <button type="submit" disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((client) => (
                  <button
                    type="button"
                    key={client.id}
                    className={
                      selectedClient?.id === client.id
                        ? styles.searchResultSelected
                        : styles.searchResult
                    }
                    onClick={() => setSelectedClient(client)}
                  >
                    {client.first_name} {client.last_name}
                    {client.date_of_birth &&
                      ` — DOB ${new Date(client.date_of_birth).toLocaleDateString()}`}
                  </button>
                ))}
              </div>
            )}

            {selectedClient && (
              <form onSubmit={handleAddIndividual} className={styles.spanForm}>
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
                <button type="submit" disabled={addingIndividual}>
                  {addingIndividual ? "Adding..." : "Add to Caseload"}
                </button>
              </form>
            )}
          </div>
        )}

        {caseload.length === 0 ? (
          <p className={styles.emptyState}>No individuals on caseload yet.</p>
        ) : (
          <div className={styles.caseloadList}>
            {caseload.map((entry) => {
              const periods = splitSpanByFiscalYear(
                entry.span_start,
                entry.span_end,
              );

              return (
                <div key={entry.id} className={styles.individualCard}>
                  <div className={styles.individualHeader}>
                    <div>
                      <h3>
                        {entry.client_profile.first_name}{" "}
                        {entry.client_profile.last_name}
                      </h3>
                      <p className={styles.meta}>
                        DOB{" "}
                        {entry.client_profile.date_of_birth
                          ? new Date(
                              entry.client_profile.date_of_birth,
                            ).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    {editingId !== entry.id && (
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => startEdit(entry)}
                      >
                        Edit Span Year
                      </button>
                    )}
                  </div>

                  {editingId === entry.id ? (
                    <div className={styles.editSpanForm}>
                      {editError && (
                        <div className={styles.errorBanner}>{editError}</div>
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
                      <div className={styles.editActions}>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(entry.id)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={savingEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.spanDates}>
                      Span: {new Date(entry.span_start).toLocaleDateString()}{" "}
                      – {new Date(entry.span_end).toLocaleDateString()}
                    </p>
                  )}

                  <div className={styles.periods}>
                    {periods.map((period) => {
                      const periodRegs = registrationsInPeriod(
                        entry.registrations,
                        period,
                      );
                      const confirmedRegs = periodRegs.filter(
                        (reg) => reg.status === "confirmed",
                      );
                      const pendingRegs = periodRegs.filter(
                        (reg) => reg.status === "pending",
                      );

                      return (
                        <div key={period.label} className={styles.period}>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
