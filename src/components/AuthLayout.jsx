"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "./NavDrawer";
import styles from "./AuthLayout.module.css";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/family/signup",
  "/get-started",
  "/forgot-password",
  "/reset-password",
  "/set-password",
  "/auth/callback",
];

export default function AuthLayout({ children }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          setUserType(data.user.user_type);
        }
      } catch (err) {
        // not authenticated, pages handle their own redirects
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    // public org pages: /[slug] and /[slug]/events/[id]
    (!pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/family") &&
      !pathname.startsWith("/ssa") &&
      !pathname.startsWith("/county"));

  // isPublic depends only on pathname, so check it before the loading gate —
  // otherwise the nav placeholder would flash on public pages too, since
  // "loading" is true on every page for the first render regardless of route.
  if (isPublic) return <>{children}</>;

  if (loading) {
    return (
      <div className={styles.layout}>
        <div className={styles.navPlaceholder} />
        <div className={styles.main} style={{ marginLeft: 240 }}>
          {children}
        </div>
      </div>
    );
  }

  if (!user) return <>{children}</>;

  return (
    <div className={styles.layout}>
      <NavDrawer
        key={user?.id}
        user={user}
        userType={userType}
        onCollapse={setCollapsed}
      />
      <div className={styles.main} style={{ marginLeft: collapsed ? 60 : 240 }}>
        {children}
      </div>
    </div>
  );
}
