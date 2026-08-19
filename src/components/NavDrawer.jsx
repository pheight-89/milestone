"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import styles from "./NavDrawer.module.css";

export default function NavDrawer({ user, userType, onCollapse }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  function handleToggle() {
    const next = !collapsed;
    setCollapsed(next);
    onCollapse?.(next);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const links = getNavLinks(user, userType);

  return (
    <nav className={`${styles.drawer} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.header}>
        <span className={styles.logo}>Milestone</span>
        <button
          className={styles.toggleButton}
          onClick={handleToggle}
          aria-label="Toggle navigation"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <ul className={styles.links}>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`${styles.link} ${pathname === link.href ? styles.active : ""}`}
            >
              <span className={styles.linkIcon}>{link.icon}</span>
              {!collapsed && (
                <span className={styles.linkLabel}>{link.label}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        {!collapsed && (
          <span className={styles.userEmail}>{user?.email}</span>
        )}
        <button onClick={handleLogout} className={styles.logoutButton}>
          <span className={styles.linkIcon}>⎋</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </nav>
  );
}

function getNavLinks(user, userType) {
  if (userType === "family") {
    return [
      { href: "/family/dashboard", label: "My Dashboard", icon: "⌂" },
      {
        href: "/family/dashboard#profiles",
        label: "My Profiles",
        icon: "👤",
      },
      { href: "/family/dashboard#events", label: "Find Events", icon: "📅" },
    ];
  }

  if (user?.org_type === "county_board") {
    if (user?.role === "ssa") {
      return [{ href: "/ssa/dashboard", label: "My Caseload", icon: "📋" }];
    }
    // county board admin
    return [
      { href: "/county/dashboard", label: "Dashboard", icon: "⌂" },
      {
        href: "/county/dashboard#billing-codes",
        label: "Billing Codes",
        icon: "💲",
      },
      {
        href: "/county/dashboard#provider-orgs",
        label: "Provider Orgs",
        icon: "🏢",
      },
      { href: "/county/dashboard#team", label: "Team", icon: "👥" },
    ];
  }

  // provider org staff
  if (user?.role === "admin") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: "⌂" },
      { href: "/dashboard/events", label: "Events", icon: "📅" },
      { href: "/dashboard/fields", label: "Client Fields", icon: "📝" },
      { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
    ];
  }

  // provider org staff (non-admin)
  return [
    { href: "/dashboard", label: "Dashboard", icon: "⌂" },
    { href: "/dashboard/events", label: "Events", icon: "📅" },
  ];
}
