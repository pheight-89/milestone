"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";
import styles from "./county-dashboard.module.css";

export default function CountyDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [counties, setCounties] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [ssas, setSsas] = useState([]);
  const [totalCaseload, setTotalCaseload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [providerOrgs, setProviderOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [addOrgCountyId, setAddOrgCountyId] = useState("");
  const [addingOrg, setAddingOrg] = useState(false);
  const [addOrgError, setAddOrgError] = useState(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("ssa");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [billingCodes, setBillingCodes] = useState([]);
  const [editingCodeId, setEditingCodeId] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editIsAddon, setEditIsAddon] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [codeError, setCodeError] = useState(null);

  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newIsAddon, setNewIsAddon] = useState(false);
  const [addingCode, setAddingCode] = useState(false);
  const [addCodeError, setAddCodeError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (
          !res.ok ||
          data.user.user_type !== "staff" ||
          data.user.org_type !== "county_board" ||
          data.user.role !== "admin"
        ) {
          router.push("/login");
          return;
        }

        setUser(data.user);

        const [dashRes, providerOrgsRes, billingCodesRes] = await Promise.all([
          fetch("/api/county/dashboard"),
          fetch("/api/county/provider-orgs"),
          fetch("/api/billing-codes"),
        ]);
        const dashData = await dashRes.json();

        if (dashRes.ok) {
          setCounties(dashData.counties);
          setOrgs(dashData.orgs);
          setSsas(dashData.ssas);
          setTotalCaseload(dashData.total_caseload);
          if (dashData.counties.length > 0) {
            setAddOrgCountyId(dashData.counties[0].id);
          }
        } else {
          setError(dashData.error);
        }

        const providerOrgsData = await providerOrgsRes.json();
        if (providerOrgsRes.ok) {
          setProviderOrgs(
            providerOrgsData.orgs.map((org) => ({
              id: org.id,
              label: org.name,
            })),
          );
        }

        const billingCodesData = await billingCodesRes.json();
        if (billingCodesRes.ok) {
          setBillingCodes(billingCodesData.codes);
        }
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  async function handleLinkOrg() {
    setAddOrgError(null);
    setAddingOrg(true);

    try {
      const linkRes = await fetch("/api/county/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: selectedOrg.id,
          county_id: addOrgCountyId,
        }),
      });

      const linkData = await linkRes.json();

      if (!linkRes.ok) {
        setAddOrgError(linkData.error);
        return;
      }

      const county = counties.find((c) => c.id === addOrgCountyId);
      setOrgs((prev) => [
        ...prev,
        {
          link_id: linkData.link.id,
          org_id: selectedOrg.id,
          org_name: selectedOrg.label,
          county_id: addOrgCountyId,
          county_name: county?.name,
        },
      ]);
      setSelectedOrg(null);
    } catch (err) {
      setAddOrgError("Something went wrong. Please try again.");
    } finally {
      setAddingOrg(false);
    }
  }

  async function handleRemoveOrg(orgId) {
    if (!confirm("Remove this organization from your county?")) return;

    try {
      const res = await fetch(`/api/county/orgs/${orgId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      setOrgs((prev) => prev.filter((o) => o.org_id !== orgId));
    } catch (err) {
      setError("Failed to remove organization.");
    }
  }

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
      if (inviteRole === "ssa") {
        setSsas((prev) => [
          ...prev,
          { email: inviteEmail, role: "ssa", caseload_count: 0 },
        ]);
      }
    } catch (err) {
      setInviteError("Something went wrong. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function handleAddCode(e) {
    e.preventDefault();
    setAddCodeError(null);
    setAddingCode(true);

    try {
      const res = await fetch("/api/billing-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.toUpperCase(),
          description: newDescription,
          rate: parseFloat(newRate),
          is_addon: newIsAddon,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddCodeError(data.error);
        return;
      }

      setBillingCodes((prev) => [...prev, data.billing_code]);
      setNewCode("");
      setNewDescription("");
      setNewRate("");
      setNewIsAddon(false);
    } catch (err) {
      setAddCodeError("Something went wrong. Please try again.");
    } finally {
      setAddingCode(false);
    }
  }

  function startEditCode(code) {
    setEditingCodeId(code.id);
    setEditDescription(code.description);
    setEditRate(code.rate);
    setEditIsAddon(code.is_addon);
    setCodeError(null);
  }

  async function handleSaveCode(codeId) {
    setSavingCode(true);
    setCodeError(null);

    try {
      const res = await fetch(`/api/billing-codes/${codeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDescription,
          rate: parseFloat(editRate),
          is_addon: editIsAddon,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCodeError(data.error);
        return;
      }

      setBillingCodes((prev) =>
        prev.map((c) => (c.id === codeId ? data.billing_code : c)),
      );
      setEditingCodeId(null);
    } catch (err) {
      setCodeError("Failed to save changes.");
    } finally {
      setSavingCode(false);
    }
  }

  async function handleToggleActive(code) {
    try {
      const res = await fetch(`/api/billing-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !code.active }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCodeError(data.error);
        return;
      }

      setBillingCodes((prev) =>
        prev.map((c) => (c.id === code.id ? data.billing_code : c)),
      );
    } catch (err) {
      setCodeError("Failed to update status.");
    }
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
          <h1 className={styles.title}>County Board Dashboard</h1>
          <p className={styles.subtitle}>{user?.email}</p>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.widgetGrid}>
        <div className={styles.widgetCard}>
          <span className={styles.widgetNumber}>{ssas.length}</span>
          <span className={styles.widgetLabel}>active</span>
          <span className={styles.widgetTitle}>SSAs</span>
        </div>
        <div className={styles.widgetCard}>
          <span className={styles.widgetNumber}>{orgs.length}</span>
          <span className={styles.widgetLabel}>in county</span>
          <span className={styles.widgetTitle}>Provider Orgs</span>
        </div>
        <div className={styles.widgetCard}>
          <span className={styles.widgetNumber}>{totalCaseload}</span>
          <span className={styles.widgetLabel}>individuals</span>
          <span className={styles.widgetTitle}>Total Caseload</span>
        </div>
      </div>

      <div id="provider-orgs" className={styles.card}>
        <h2>Provider Organizations</h2>

        {orgs.length === 0 ? (
          <p className={styles.emptyState}>
            No provider organizations linked yet.
          </p>
        ) : (
          <div className={styles.list}>
            {orgs.map((org) => (
              <div key={org.link_id} className={styles.listRow}>
                <span>
                  {org.org_name}{" "}
                  <span className={styles.meta}>({org.county_name})</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveOrg(org.org_id)}
                  className={styles.removeButton}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.inlineForm}>
          <h3>Add Provider Org</h3>
          {addOrgError && (
            <div className={styles.errorBanner}>{addOrgError}</div>
          )}
          <div className={styles.formRow}>
            <SearchableSelect
              items={providerOrgs}
              onSelect={setSelectedOrg}
              selected={selectedOrg}
              placeholder="Search provider orgs..."
            />
            <select
              value={addOrgCountyId}
              onChange={(e) => setAddOrgCountyId(e.target.value)}
              required
            >
              {counties.map((county) => (
                <option key={county.id} value={county.id}>
                  {county.name}
                </option>
              ))}
            </select>
            {selectedOrg && addOrgCountyId && (
              <button
                type="button"
                onClick={handleLinkOrg}
                disabled={addingOrg}
              >
                {addingOrg ? "Linking..." : "Link Org"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div id="billing-codes" className={styles.card}>
        <h2>Billing Codes</h2>

        {codeError && <div className={styles.errorBanner}>{codeError}</div>}

        {billingCodes.length === 0 ? (
          <p className={styles.emptyState}>No billing codes yet.</p>
        ) : (
          <table className={styles.codesTable}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Rate</th>
                <th>Type</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {billingCodes.map((code) =>
                editingCodeId === code.id ? (
                  <tr key={code.id}>
                    <td colSpan={6}>
                      <div className={styles.editCodeForm}>
                        <span className={styles.codeReadOnly}>
                          {code.code}
                        </span>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) =>
                            setEditDescription(e.target.value)
                          }
                          placeholder="Description"
                          required
                        />
                        <input
                          type="number"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          min="0.01"
                          step="0.01"
                          required
                        />
                        <label className={styles.addonCheckbox}>
                          <input
                            type="checkbox"
                            checked={editIsAddon}
                            onChange={(e) =>
                              setEditIsAddon(e.target.checked)
                            }
                          />
                          Add-on
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSaveCode(code.id)}
                          disabled={savingCode}
                        >
                          {savingCode ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCodeId(null)}
                          disabled={savingCode}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={code.id}>
                    <td>{code.code}</td>
                    <td>{code.description}</td>
                    <td>${Number(code.rate).toFixed(2)}</td>
                    <td>
                      {code.is_addon && (
                        <span className={styles.addonBadge}>Add-on</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          code.active
                            ? styles.activeBadge
                            : styles.inactiveBadge
                        }
                      >
                        {code.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.codeActions}>
                        <button
                          type="button"
                          onClick={() => startEditCode(code)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(code)}
                        >
                          {code.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}

        <div className={styles.inlineForm}>
          <h3>Add Code</h3>
          {addCodeError && (
            <div className={styles.errorBanner}>{addCodeError}</div>
          )}
          <form onSubmit={handleAddCode} className={styles.formRow}>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="Code (e.g. CMP1)"
              required
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description"
              required
            />
            <input
              type="number"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="Rate"
              min="0.01"
              step="0.01"
              required
            />
            <label className={styles.addonCheckbox}>
              <input
                type="checkbox"
                checked={newIsAddon}
                onChange={(e) => setNewIsAddon(e.target.checked)}
              />
              Add-on
            </label>
            <button type="submit" disabled={addingCode}>
              {addingCode ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      </div>

      <div id="team" className={styles.card}>
        <h2>SSAs</h2>

        {ssas.length === 0 ? (
          <p className={styles.emptyState}>No SSAs invited yet.</p>
        ) : (
          <div className={styles.list}>
            {ssas.map((ssa) => (
              <div key={ssa.id || ssa.email} className={styles.listRow}>
                <span>{ssa.email}</span>
                <span className={styles.meta}>
                  {ssa.caseload_count} on caseload
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.inlineForm}>
          <h3>Invite Staff</h3>

          {inviteSuccess && (
            <div className={styles.successBanner}>
              Invite sent successfully!
            </div>
          )}
          {inviteError && (
            <div className={styles.errorBanner}>{inviteError}</div>
          )}

          <form onSubmit={handleInvite} className={styles.formRow}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="staff@example.com"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="ssa">SSA</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={inviting}>
              {inviting ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
