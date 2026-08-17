"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./profile-id.module.css";

export default function ProfileDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    primary_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    support_needs: "",
    allergies: "",
    notes: "",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (!meRes.ok || meData.user.user_type !== "family") {
          router.push("/login");
          return;
        }

        const res = await fetch(`/api/family/profiles/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error);
          return;
        }

        setProfile(data.profile);
        setFormData({
          first_name: data.profile.first_name || "",
          last_name: data.profile.last_name || "",
          date_of_birth: data.profile.date_of_birth || "",
          primary_phone: data.profile.primary_phone || "",
          emergency_contact_name: data.profile.emergency_contact_name || "",
          emergency_contact_phone: data.profile.emergency_contact_phone || "",
          emergency_contact_relationship:
            data.profile.emergency_contact_relationship || "",
          support_needs: data.profile.support_needs || "",
          allergies: data.profile.allergies || "",
          notes: data.profile.notes || "",
        });
      } catch (err) {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [id, router]);

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/family/profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setProfile(data.profile);
      setEditing(false);
    } catch (err) {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading profile...</p>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>{error}</p>
        <Link href="/family/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <Link href="/family/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <div className={styles.headerActions}>
          <h1 className={styles.title}>
            {profile.first_name} {profile.last_name}
          </h1>
          <button
            onClick={() => setEditing(!editing)}
            className={styles.editButton}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.details}>
        {editing ? (
          <div className={styles.card}>
            <h2>Edit Profile</h2>
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formField}>
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="date_of_birth">Date of Birth</label>
                <input
                  type="date"
                  id="date_of_birth"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="primary_phone">Primary Phone</label>
                <input
                  type="tel"
                  id="primary_phone"
                  name="primary_phone"
                  value={formData.primary_phone}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="emergency_contact_name">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="emergency_contact_phone">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="emergency_contact_relationship">
                  Emergency Contact Relationship
                </label>
                <input
                  type="text"
                  id="emergency_contact_relationship"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="support_needs">Support Needs</label>
                <textarea
                  id="support_needs"
                  name="support_needs"
                  rows={3}
                  value={formData.support_needs}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="allergies">Allergies</label>
                <textarea
                  id="allergies"
                  name="allergies"
                  rows={3}
                  value={formData.allergies}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className={styles.card}>
            <h2>Details</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.label}>Date of Birth</span>
                <span>{profile.date_of_birth || "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Primary Phone</span>
                <span>{profile.primary_phone || "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Emergency Contact</span>
                <span>{profile.emergency_contact_name || "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Emergency Phone</span>
                <span>{profile.emergency_contact_phone || "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Relationship</span>
                <span>{profile.emergency_contact_relationship || "—"}</span>
              </div>
            </div>
            {profile.support_needs && (
              <p className={styles.description}>
                <strong>Support Needs:</strong> {profile.support_needs}
              </p>
            )}
            {profile.allergies && (
              <p className={styles.description}>
                <strong>Allergies:</strong> {profile.allergies}
              </p>
            )}
            {profile.notes && (
              <p className={styles.description}>
                <strong>Notes:</strong> {profile.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
