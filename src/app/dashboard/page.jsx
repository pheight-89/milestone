"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [staff, setStaff] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrationSummary, setRegistrationSummary] = useState({
    pending_count: 0,
    confirmed_count: 0,
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

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

        const orgRes = await fetch(`/api/orgs/${data.user.org_id}`);
        const orgData = await orgRes.json();
        if (orgRes.ok) {
          setOrg(orgData.org);
        }

        const [eventsRes, registrationsRes, teamRes] = await Promise.all([
          fetch("/api/events"),
          fetch(`/api/registrations/summary?org_id=${data.user.org_id}`),
          fetch("/api/team"),
        ]);

        const eventsData = await eventsRes.json();
        if (eventsRes.ok) setEvents(eventsData.data);

        const registrationsData = await registrationsRes.json();
        if (registrationsRes.ok) setRegistrationSummary(registrationsData);

        const teamData = await teamRes.json();
        if (teamRes.ok) setStaff(teamData.staff);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error);
        return;
      }

      setInviteSuccess(true);
      setInviteEmail("");
      setStaff((prev) => [...prev, { email: inviteEmail, role: inviteRole }]);
    } catch (err) {
      setInviteError("Something went wrong. Please try again.");
    } finally {
      setInviting(false);
    }
  }
  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  const now = new Date();
  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextEvent = upcomingEvents[0] || null;

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.orgName}>{org?.name}</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.widgetGrid}>
          <div className={styles.widgetCard}>
            <span className={styles.widgetNumber}>
              {upcomingEvents.length}
            </span>
            <span className={styles.widgetLabel}>events ahead</span>
            <span className={styles.widgetTitle}>Upcoming Events</span>
          </div>
          <div className={styles.widgetCard}>
            <span className={styles.widgetNumber}>
              {registrationSummary.pending_count}
            </span>
            <span className={styles.widgetLabel}>need action</span>
            <span className={styles.widgetTitle}>Pending Reviews</span>
          </div>
          <div className={styles.widgetCard}>
            <span className={styles.widgetNumber}>
              {registrationSummary.confirmed_count}
            </span>
            <span className={styles.widgetLabel}>registrations</span>
            <span className={styles.widgetTitle}>Confirmed</span>
          </div>
          <div className={styles.widgetCard}>
            <span className={styles.widgetNumber}>{staff.length}</span>
            <span className={styles.widgetLabel}>staff accounts</span>
            <span className={styles.widgetTitle}>Team Members</span>
          </div>
        </div>

        {nextEvent && (
          <div className={styles.nextEventCard}>
            <h3>Next Event</h3>
            <p>
              <Link href={`/dashboard/events/${nextEvent.id}`}>
                {nextEvent.title}
              </Link>{" "}
              —{" "}
              {new Date(nextEvent.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {nextEvent.location && ` | ${nextEvent.location}`}
            </p>
          </div>
        )}

        <div className={styles.card}>
          <h2>Quick Links</h2>
          <div className={styles.linksRow}>
            <Link href="/dashboard/events">Events</Link>
            {user?.role === "admin" && (
              <Link href="/dashboard/fields">Client Fields</Link>
            )}
            <Link href="/dashboard/settings">Settings</Link>
          </div>
          <div className={styles.meta}>
            <span>Role: {user?.role}</span>
            <span>Organization: {org?.name}</span>
          </div>
        </div>
      </div>

      {user?.role === "admin" && (
        <div className={styles.card} style={{ marginTop: "1.5rem" }}>
          <h2>Team</h2>

          {/* Current staff list */}
          <div className={styles.staffList}>
            {staff.map((member) => (
              <div
                key={member.id || member.email}
                className={styles.staffMember}
              >
                <span>{member.email}</span>
                <span className={styles.roleBadge}>{member.role}</span>
              </div>
            ))}
          </div>

          {/* Invite form */}
          <div className={styles.inviteSection}>
            <h3>Invite Staff Member</h3>

            {inviteSuccess && (
              <div className={styles.successBanner}>
                Invite sent successfully!
              </div>
            )}

            {inviteError && (
              <div className={styles.errorBanner}>{inviteError}</div>
            )}

            <form onSubmit={handleInvite} className={styles.inviteForm}>
              <div className={styles.inviteFields}>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="staff@organization.org"
                  required
                  className={styles.inviteInput}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className={styles.roleSelect}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  className={styles.inviteButton}
                  disabled={inviting}
                >
                  {inviting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
