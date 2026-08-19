"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchableSelect from "@/components/SearchableSelect";
import styles from "./family-dashboard.module.css";

export default function FamilyDashboardPage() {
  const router = useRouter();
  const [family, setFamily] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [counties, setCounties] = useState([]);
  const [eventSearch, setEventSearch] = useState("");
  const [eventCounty, setEventCounty] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState(null);

  async function fetchEvents(searchQuery, countyItem) {
    setLoadingEvents(true);
    setEventsError(null);

    try {
      const params = new URLSearchParams();
      if (countyItem) params.set("county_id", countyItem.id);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/public/events?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setEvents(data.events);
      } else {
        setEventsError(data.error);
      }
    } catch (err) {
      setEventsError("Failed to load events.");
    } finally {
      setLoadingEvents(false);
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

        setFamily(data.user);

        const [profilesRes, registrationsRes, countiesRes] =
          await Promise.all([
            fetch("/api/family/profiles"),
            fetch("/api/family/registrations"),
            fetch("/api/counties"),
          ]);

        const profilesData = await profilesRes.json();

        if (profilesRes.ok) {
          setProfiles(profilesData.profiles);
        } else {
          setError(profilesData.error);
        }

        const registrationsData = await registrationsRes.json();

        if (registrationsRes.ok) {
          setRegistrations(registrationsData.registrations);
        }

        const countiesData = await countiesRes.json();
        let initialCounty = null;

        if (countiesRes.ok) {
          setCounties(
            countiesData.counties.map((county) => ({
              id: county.id,
              label: county.name,
            })),
          );
        }

        if (profilesRes.ok && profilesData.family_county_id) {
          initialCounty = {
            id: profilesData.family_county_id,
            label: profilesData.family_county_name,
          };
          setEventCounty(initialCounty);
        }

        fetchEvents("", initialCounty);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  function handleEventSearchSubmit(e) {
    e.preventDefault();
    fetchEvents(eventSearch, eventCounty);
  }

  function handleEventCountyChange(item) {
    setEventCounty(item);
    fetchEvents(eventSearch, item);
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
          <h1 className={styles.title}>Welcome</h1>
          <p className={styles.subtitle}>{family?.email}</p>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div id="events" className={styles.card}>
        <h2>Find Events</h2>

        <form onSubmit={handleEventSearchSubmit} className={styles.eventSearchRow}>
          <input
            type="text"
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            placeholder="Search events..."
            className={styles.eventSearchInput}
          />
          <div className={styles.eventCountySelect}>
            <SearchableSelect
              items={counties}
              onSelect={handleEventCountyChange}
              selected={eventCounty}
              placeholder="All counties"
            />
          </div>
          <button type="submit">Search</button>
        </form>

        <p className={styles.eventsScope}>
          {eventCounty
            ? `Showing events in ${eventCounty.label} County`
            : "Showing all events"}
        </p>

        {eventsError && <div className={styles.errorBanner}>{eventsError}</div>}

        {loadingEvents ? (
          <p className={styles.emptyState}>Loading events...</p>
        ) : events.length === 0 ? (
          <p className={styles.emptyState}>No upcoming events found.</p>
        ) : (
          <div className={styles.eventsList}>
            {events.map((event) => {
              const date = new Date(event.date);
              return (
                <div key={event.id} className={styles.eventCard}>
                  <div>
                    <span className={styles.profileName}>{event.title}</span>
                    <span className={styles.registrationMeta}>
                      {event.org_name} · {date.toLocaleDateString()} ·{" "}
                      {event.location || "TBD"} ·{" "}
                      {Number(event.cost)
                        ? `$${Number(event.cost).toFixed(2)}`
                        : "Free"}
                    </span>
                  </div>
                  <Link
                    href={`/${event.org_slug}/events/${event.id}`}
                    className={styles.editLink}
                  >
                    View Event
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div id="profiles" className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Your People</h2>
          <Link href="/family/profiles/new" className={styles.addButton}>
            Add Person
          </Link>
        </div>

        {profiles.length === 0 ? (
          <p className={styles.emptyState}>No profiles yet.</p>
        ) : (
          <div className={styles.profilesList}>
            {profiles.map((profile) => (
              <div key={profile.id} className={styles.profileRow}>
                <span className={styles.profileName}>
                  {profile.first_name} {profile.last_name}
                </span>
                <Link
                  href={`/family/profiles/${profile.id}`}
                  className={styles.editLink}
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${styles.card} ${styles.registrationsCard}`}>
        <div className={styles.cardHeader}>
          <h2>Registrations</h2>
        </div>

        {registrations.length === 0 ? (
          <p className={styles.emptyState}>No registrations yet.</p>
        ) : (
          <div className={styles.registrationsList}>
            {registrations.map((reg) => {
              const date = reg.event_date ? new Date(reg.event_date) : null;
              return (
                <div key={reg.id} className={styles.registrationRow}>
                  <div>
                    <span className={styles.profileName}>
                      {reg.event_title}
                    </span>
                    <span className={styles.registrationMeta}>
                      {reg.org_name} · {date ? date.toLocaleDateString() : ""}{" "}
                      · {reg.client_first_name} {reg.client_last_name}
                    </span>
                  </div>
                  <div className={styles.registrationStatusGroup}>
                    <span className={styles.statusBadge}>{reg.status}</span>
                    <span className={styles.paymentTypeLabel}>
                      {reg.payment_type === "self_pay"
                        ? "Self Pay"
                        : "Funded"}
                    </span>
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
