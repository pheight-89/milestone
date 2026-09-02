"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./ssa-dashboard.module.css";

function formatSpanDate(value) {
  // span_start/span_end are date-only ("YYYY-MM-DD"). Parsing that directly
  // with `new Date()` treats it as UTC midnight, which can display as the
  // previous day in timezones behind UTC — build the date from local parts
  // instead.
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function mostRecentSpan(spans) {
  if (!spans || spans.length === 0) return null;
  return spans.reduce((latest, span) =>
    new Date(span.span_start) > new Date(latest.span_start) ? span : latest,
  );
}

export default function SsaDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [caseload, setCaseload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddIndividual, setShowAddIndividual] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [addSpanStart, setAddSpanStart] = useState("");
  const [addSpanEnd, setAddSpanEnd] = useState("");
  const [addingIndividual, setAddingIndividual] = useState(false);
  const [addError, setAddError] = useState(null);

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

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  // Group per-span caseload rows into one card per individual.
  const individualsById = new Map();
  for (const entry of caseload) {
    const existing = individualsById.get(entry.client_profile.id);
    if (existing) {
      existing.spans.push(entry);
    } else {
      individualsById.set(entry.client_profile.id, {
        client_profile: entry.client_profile,
        spans: [entry],
      });
    }
  }
  const individuals = [...individualsById.values()];

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

        {individuals.length === 0 ? (
          <p className={styles.emptyState}>No individuals on caseload yet.</p>
        ) : (
          <div className={styles.caseloadList}>
            {individuals.map(({ client_profile, spans }) => {
              const recentSpan = mostRecentSpan(spans);

              return (
                <div
                  key={client_profile.id}
                  className={styles.individualCard}
                  onClick={() =>
                    router.push(`/ssa/caseload/${client_profile.id}`)
                  }
                >
                  <h3>
                    {client_profile.first_name} {client_profile.last_name}
                  </h3>
                  <p className={styles.spanDates}>
                    {recentSpan
                      ? `Span: ${formatSpanDate(recentSpan.span_start)} - ${formatSpanDate(recentSpan.span_end)}`
                      : "No span year set"}
                  </p>
                  <span className={styles.viewProfile}>View Profile →</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
