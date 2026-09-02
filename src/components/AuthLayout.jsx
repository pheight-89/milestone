"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "./NavDrawer";
import TopBar from "./TopBar";
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

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    // public org pages: /[slug] and /[slug]/events/[id]
    (!pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/family") &&
      !pathname.startsWith("/ssa") &&
      !pathname.startsWith("/county"));

  useEffect(() => {
    async function loadUser() {
      setUser(null);
      setUserType(null);
      setLoading(true);

      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          setUserType(data.user.user_type);
        } else if (!isPublic) {
          // httpOnly cookies aren't readable from JS, so a failed fetch on a
          // protected route is the only signal we get that the session is
          // gone. Force a full page redirect (not router.push) so every
          // client-side component's state — including this one — is
          // guaranteed to be torn down rather than left stale.
          window.location.href = "/login";
        }
      } catch (err) {
        // not authenticated, pages handle their own redirects
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [isPublic]);

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
      <div className={styles.content}>
        <TopBar user={user} collapsed={collapsed} />
        <main
          className={styles.main}
          style={{ marginLeft: collapsed ? 60 : 240, paddingTop: "56px" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
