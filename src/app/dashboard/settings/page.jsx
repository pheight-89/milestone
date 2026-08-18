"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchableSelect from "@/components/SearchableSelect";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [counties, setCounties] = useState([]);
  const [allCounties, setAllCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [addingCounty, setAddingCounty] = useState(false);
  const [addError, setAddError] = useState(null);
  const [removingCountyId, setRemovingCountyId] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok || data.user.user_type !== "staff") {
          router.push("/login");
          return;
        }

        setUser(data.user);

        const [orgRes, countiesRes, allCountiesRes] = await Promise.all([
          fetch(`/api/orgs/${data.user.org_id}`),
          fetch("/api/org-counties"),
          fetch("/api/counties"),
        ]);

        const orgData = await orgRes.json();
        if (orgRes.ok) setOrg(orgData.org);

        const countiesData = await countiesRes.json();
        if (countiesRes.ok) setCounties(countiesData.counties);

        const allCountiesData = await allCountiesRes.json();
        if (allCountiesRes.ok) {
          setAllCounties(
            allCountiesData.counties.map((c) => ({
              id: c.id,
              label: c.name,
            })),
          );
        }
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  async function handleAddCounty(item) {
    if (!item) return;

    setAddError(null);
    setAddingCounty(true);

    try {
      const res = await fetch("/api/county/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: user.org_id, county_id: item.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error);
        return;
      }

      setCounties((prev) => [
        ...prev,
        { link_id: data.link.id, id: item.id, name: item.label },
      ]);
    } catch (err) {
      setAddError("Something went wrong. Please try again.");
    } finally {
      setAddingCounty(false);
    }
  }

  async function handleRemoveCounty(countyId) {
    if (!confirm("Remove this county from your organization?")) return;

    setRemovingCountyId(countyId);
    setError(null);

    try {
      const res = await fetch(`/api/org-counties/${countyId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      setCounties((prev) => prev.filter((c) => c.id !== countyId));
    } catch (err) {
      setError("Failed to remove county.");
    } finally {
      setRemovingCountyId(null);
    }
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  const isAdmin = user?.role === "admin";
  const availableCounties = allCounties.filter(
    (c) => !counties.find((linked) => linked.id === c.id),
  );

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <h2>Organization</h2>
        <div className={styles.readonlyField}>
          <span className={styles.label}>Name</span>
          <span>{org?.name}</span>
        </div>
        <div className={styles.readonlyField}>
          <span className={styles.label}>Slug</span>
          <span>{org?.slug}</span>
        </div>
      </div>

      <div className={styles.card}>
        <h2>Counties</h2>

        {counties.length === 0 ? (
          <p className={styles.emptyState}>Not linked to any counties yet.</p>
        ) : (
          <div className={styles.list}>
            {counties.map((county) => (
              <div key={county.id} className={styles.listRow}>
                <span>{county.name}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCounty(county.id)}
                    disabled={removingCountyId === county.id}
                    className={styles.removeButton}
                  >
                    {removingCountyId === county.id
                      ? "Removing..."
                      : "Remove"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className={styles.inlineForm}>
            <h3>Add County</h3>
            {addError && (
              <div className={styles.errorBanner}>{addError}</div>
            )}
            <SearchableSelect
              items={availableCounties}
              onSelect={handleAddCounty}
              selected={null}
              placeholder={
                addingCounty ? "Adding..." : "Search counties..."
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}
