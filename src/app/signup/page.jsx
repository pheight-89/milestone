"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchableMultiSelect from "@/components/SearchableMultiSelect";
import styles from "./signup.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    orgName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [counties, setCounties] = useState([]);
  const [selectedCounties, setSelectedCounties] = useState([]);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCounties() {
      try {
        const res = await fetch("/api/counties");
        const data = await res.json();
        if (res.ok) {
          setCounties(
            data.counties.map((county) => ({
              id: county.id,
              label: county.name,
            })),
          );
        }
      } catch (err) {
        // County selection is optional — silently skip if this fails.
      }
    }

    loadCounties();
  }, []);

  function handleChange(e) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: formData.orgName,
          email: formData.email,
          password: formData.password,
          county_ids: selectedCounties.map((county) => county.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      router.push("/login?signup=success");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Your Account</h1>
        <p className={styles.subtitle}>
          Set up Milestone for your organization
        </p>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="orgName">Organization Name</label>
            <input
              id="orgName"
              name="orgName"
              type="text"
              value={formData.orgName}
              onChange={handleChange}
              placeholder="Enter your organization name"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Counties (optional)</label>
            <SearchableMultiSelect
              items={counties}
              onChange={setSelectedCounties}
              selected={selectedCounties}
              placeholder="Search counties..."
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@organization.com"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className={styles.loginLink}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
