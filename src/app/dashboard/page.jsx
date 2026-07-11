"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("milestone_token");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          localStorage.removeItem("milestone_token");
          router.push("/login");
          return;
        }

        setUser(data.user);

        const orgRes = await fetch(`/api/orgs/${data.user.org_id}`);
        const orgData = await orgRes.json();
        if (orgRes.ok) {
          setOrg(orgData.org);
        }
      } catch (err) {
        localStorage.removeItem("milestone_token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogout() {
    await fetch("api/auth/logout", { method: "POST" });
    localStorage.removeItem("milestone_token");
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
          <div className={styles.meta}>
            <span>Role: {user?.role}</span>
            <span>Organization: {org?.name}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
