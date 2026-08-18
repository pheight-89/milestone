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

        const teamRes = await fetch("/api/team");
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
  async function handleLogout() {
    await fetch("api/auth/logout", { method: "POST" });
    router.push("/login");
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
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.orgName}>{user?.email}</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Sign Out
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <h2>Welcome to Milestone</h2>
          <p>Your dashboard is ready. Events and rosters coming soon.</p>
          <Link href="/dashboard/events">EVENTS</Link>
          {user?.role === "admin" && (
            <Link href="/dashboard/fields">Client Fields</Link>
          )}
          <Link href="/dashboard/settings">Settings</Link>
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
