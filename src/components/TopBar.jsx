"use client";
import { useRouter } from "next/navigation";
import styles from "./TopBar.module.css";

export default function TopBar({ user, collapsed }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div
      className={styles.topBar}
      style={{ left: collapsed ? 60 : 240 }}
    >
      <div className={styles.right}>
        <span className={styles.email}>{user?.email}</span>
        <button onClick={handleLogout} className={styles.signOutButton}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
