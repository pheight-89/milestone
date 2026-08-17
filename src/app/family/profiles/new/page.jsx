"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./new-profile.module.css";

export default function NewProfilePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
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
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok || data.user.user_type !== "family") {
          router.push("/login");
          return;
        }
      } catch (err) {
        router.push("/login");
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/family/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/family/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Add a Person</h1>
        <Link href="/family/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formField}>
            <label htmlFor="first_name">First Name</label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="last_name">Last Name</label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="date_of_birth">Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              id="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="primary_phone">Primary Phone</label>
            <input
              type="tel"
              name="primary_phone"
              id="primary_phone"
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
              name="emergency_contact_name"
              id="emergency_contact_name"
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
              name="emergency_contact_phone"
              id="emergency_contact_phone"
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
              name="emergency_contact_relationship"
              id="emergency_contact_relationship"
              value={formData.emergency_contact_relationship}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="support_needs">Support Needs</label>
            <textarea
              name="support_needs"
              id="support_needs"
              rows={3}
              value={formData.support_needs}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="allergies">Allergies</label>
            <textarea
              name="allergies"
              id="allergies"
              rows={3}
              value={formData.allergies}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="notes">Notes</label>
            <textarea
              name="notes"
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Add Person"}
          </button>
        </form>
      </div>
    </main>
  );
}
