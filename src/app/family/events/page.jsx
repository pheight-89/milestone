"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchableSelect from "@/components/SearchableSelect";
import styles from "./family-events.module.css";

export default function FamilyEventsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [counties, setCounties] = useState([]);
  const [selectedCounty, setSelectedCounty] = useState(null);

  const [agencies, setAgencies] = useState([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [agenciesError, setAgenciesError] = useState(null);
  const [search, setSearch] = useState("");

  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [eventsByOrg, setEventsByOrg] = useState({});
  const [loadingOrgEvents, setLoadingOrgEvents] = useState(null);

  async function fetchAgencies(countyItem) {
    setLoadingAgencies(true);
    setAgenciesError(null);

    try {
      const params = new URLSearchParams();
      if (countyItem) params.set("county_id", countyItem.id);

      const res = await fetch(`/api/public/agencies?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setAgencies(data.agencies);
      } else {
        setAgenciesError(data.error);
      }
    } catch (err) {
      setAgenciesError("Failed to load agencies.");
    } finally {
      setLoadingAgencies(false);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok || data.user.user_type !== "family") {
          router.push("/login");
          return;
        }

        const [profilesRes, countiesRes] = await Promise.all([
          fetch("/api/family/profiles"),
          fetch("/api/counties"),
        ]);

        const countiesData = await countiesRes.json();
        if (countiesRes.ok) {
          setCounties(
            countiesData.counties.map((county) => ({
              id: county.id,
              label: county.name,
            })),
          );
        }

        const profilesData = await profilesRes.json();
        let initialCounty = null;

        if (profilesRes.ok && profilesData.family_county_id) {
          initialCounty = {
            id: profilesData.family_county_id,
            label: profilesData.family_county_name,
          };
          setSelectedCounty(initialCounty);
        }

        fetchAgencies(initialCounty);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  function handleCountyChange(item) {
    setSelectedCounty(item);
    setExpandedOrgId(null);
    fetchAgencies(item);
  }

  async function toggleAgency(org) {
    if (expandedOrgId === org.id) {
      setExpandedOrgId(null);
      return;
    }

    setExpandedOrgId(org.id);

    if (!eventsByOrg[org.id]) {
      setLoadingOrgEvents(org.id);
      try {
        const res = await fetch(`/api/public/orgs/${org.slug}/events`);
        const data = await res.json();
        if (res.ok) {
          setEventsByOrg((prev) => ({ ...prev, [org.id]: data.events }));
        }
      } catch (err) {
        // leave the section open with no events on failure
      } finally {
        setLoadingOrgEvents(null);
      }
    }
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  const filteredAgencies = agencies.filter((agency) =>
    agency.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Find Events</h1>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.filterRow}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search agencies..."
            className={styles.searchInput}
          />
          <div className={styles.countySelect}>
            <SearchableSelect
              items={counties}
              onSelect={handleCountyChange}
              selected={selectedCounty}
              placeholder="All counties"
            />
          </div>
        </div>

        <p className={styles.scopeLabel}>
          {selectedCounty
            ? `Agencies in ${selectedCounty.label} County`
            : "Agencies in all counties"}
        </p>

        {agenciesError && (
          <div className={styles.errorBanner}>{agenciesError}</div>
        )}

        {loadingAgencies ? (
          <p className={styles.emptyState}>Loading agencies...</p>
        ) : filteredAgencies.length === 0 ? (
          <p className={styles.emptyState}>No agencies found.</p>
        ) : (
          <div className={styles.agencyList}>
            {filteredAgencies.map((agency) => (
              <div key={agency.id} className={styles.agencyCard}>
                <button
                  type="button"
                  className={styles.agencyHeader}
                  onClick={() => toggleAgency(agency)}
                >
                  <div>
                    <span className={styles.agencyName}>{agency.name}</span>
                    <span className={styles.agencyMeta}>
                      {agency.upcoming_event_count} upcoming event
                      {agency.upcoming_event_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className={styles.expandIcon}>
                    {expandedOrgId === agency.id ? "▲" : "▼"}
                  </span>
                </button>

                {expandedOrgId === agency.id && (
                  <div className={styles.agencyEvents}>
                    {loadingOrgEvents === agency.id ? (
                      <p className={styles.emptyState}>Loading events...</p>
                    ) : !eventsByOrg[agency.id] ||
                      eventsByOrg[agency.id].length === 0 ? (
                      <p className={styles.emptyState}>
                        No upcoming events for this agency.
                      </p>
                    ) : (
                      eventsByOrg[agency.id].map((event) => (
                        <div key={event.id} className={styles.eventRow}>
                          <div>
                            <span className={styles.eventTitle}>
                              {event.title}
                            </span>
                            <span className={styles.eventMeta}>
                              {new Date(event.date).toLocaleDateString()} ·{" "}
                              {Number(event.cost)
                                ? `$${Number(event.cost).toFixed(2)}`
                                : "Free"}
                            </span>
                          </div>
                          <Link
                            href={`/${agency.slug}/events/${event.id}`}
                            className={styles.registerButton}
                          >
                            Register
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
