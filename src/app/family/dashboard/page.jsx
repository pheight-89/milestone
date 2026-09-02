"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./family-dashboard.module.css";

function statusBadgeClass(status, styles) {
  if (status === "confirmed") return styles.statusConfirmed;
  if (status === "declined") return styles.statusDeclined;
  return styles.statusPending;
}

export default function FamilyDashboardPage() {
  const router = useRouter();
  const [family, setFamily] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState({ total: 0, confirmed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        const [profilesRes, registrationsRes, summaryRes] = await Promise.all([
          fetch("/api/family/profiles"),
          fetch("/api/family/registrations"),
          fetch("/api/family/registrations/summary"),
        ]);

        const profilesData = await profilesRes.json();

        if (profilesRes.ok) {
          setProfiles(profilesData.profiles);
        } else {
          setError(profilesData.error);
        }

        const registrationsData = await registrationsRes.json();
        if (registrationsRes.ok) setRegistrations(registrationsData.registrations);

        const summaryData = await summaryRes.json();
        if (summaryRes.ok) setSummary(summaryData);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  const registrationsByClient = new Map();
  for (const reg of registrations) {
    const clientName =
      `${reg.client_first_name || ""} ${reg.client_last_name || ""}`.trim() ||
      "Unknown";
    const list = registrationsByClient.get(clientName) || [];
    list.push(reg);
    registrationsByClient.set(clientName, list);
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

      <div className={styles.widgetGrid}>
        <div className={styles.widgetCard}>
          <span className={styles.widgetNumber}>{profiles.length}</span>
          <span className={styles.widgetLabel}>people</span>
          <span className={styles.widgetTitle}>My Profiles</span>
        </div>
        <div className={styles.widgetCard}>
          <span className={styles.widgetNumber}>{summary.total}</span>
          <span className={styles.widgetLabel}>registrations</span>
          <span className={styles.widgetTitle}>Registered</span>
        </div>
        <div className={styles.widgetCard}>
          <span className={styles.widgetNumber}>{summary.confirmed}</span>
          <span className={styles.widgetLabel}>confirmed</span>
          <span className={styles.widgetTitle}>Confirmed</span>
        </div>
      </div>

      <div id="events" className={`${styles.card} ${styles.registrationsCard}`}>
        <div className={styles.cardHeader}>
          <h2>Registered Events</h2>
          <Link href="/family/events" className={styles.addButton}>
            Find Events
          </Link>
        </div>

        {registrations.length === 0 ? (
          <p className={styles.emptyState}>No registrations yet.</p>
        ) : (
          <div className={styles.registrationGroups}>
            {[...registrationsByClient.entries()].map(([clientName, regs]) => (
              <div key={clientName} className={styles.registrationGroup}>
                <h3 className={styles.registrationGroupTitle}>{clientName}</h3>
                <div className={styles.registrationsList}>
                  {regs.map((reg) => {
                    const date = reg.event_date
                      ? new Date(reg.event_date)
                      : null;
                    return (
                      <Link
                        key={reg.id}
                        href={
                          reg.org_slug
                            ? `/${reg.org_slug}/events/${reg.event_id}`
                            : "#"
                        }
                        className={styles.registrationRow}
                      >
                        <div>
                          <span className={styles.profileName}>
                            {reg.event_title}
                          </span>
                          <span className={styles.registrationMeta}>
                            {reg.org_name} ·{" "}
                            {date ? date.toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div className={styles.registrationStatusGroup}>
                          <span
                            className={statusBadgeClass(reg.status, styles)}
                          >
                            {reg.status}
                          </span>
                          <span className={styles.paymentTypeLabel}>
                            {reg.payment_type === "self_pay"
                              ? "Self Pay"
                              : "Funded"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
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
          <div className={styles.profileCardGrid}>
            {profiles.map((profile) => (
              <div key={profile.id} className={styles.profileCard}>
                <span className={styles.profileName}>
                  {profile.first_name} {profile.last_name}
                </span>
                <span className={styles.profileDob}>
                  DOB:{" "}
                  {profile.date_of_birth
                    ? new Date(profile.date_of_birth).toLocaleDateString()
                    : "—"}
                </span>
                <Link
                  href={`/family/profiles/${profile.id}`}
                  className={styles.editLink}
                >
                  View / Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
