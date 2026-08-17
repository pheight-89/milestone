"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./register.module.css";

const BLANK_VALUE_BY_TYPE = {
  text: "",
  textarea: "",
  date: "",
  select: "",
  multiselect: [],
  checkbox: false,
};

export default function RegisterPage({ params }) {
  const { slug, id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [org, setOrg] = useState(null);
  const [event, setEvent] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [fieldDefs, setFieldDefs] = useState([]);

  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [loadingStep2, setLoadingStep2] = useState(false);
  const [stepError, setStepError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (!meRes.ok || meData.user.user_type !== "family") {
          router.push("/login");
          return;
        }

        const [orgRes, eventsRes, profilesRes, fieldsRes] = await Promise.all(
          [
            fetch(`/api/public/orgs/${slug}`),
            fetch(`/api/public/orgs/${slug}/events`),
            fetch("/api/family/profiles"),
            fetch(`/api/public/orgs/${slug}/fields`),
          ],
        );

        const orgData = await orgRes.json();
        if (!orgRes.ok) {
          setError(orgData.error);
          return;
        }
        setOrg(orgData.org);

        const eventsData = await eventsRes.json();
        const matchedEvent = eventsRes.ok
          ? eventsData.events.find((e) => e.id === id)
          : null;

        if (!matchedEvent) {
          setError("Event not found");
          return;
        }
        setEvent(matchedEvent);

        const profilesData = await profilesRes.json();
        if (profilesRes.ok) setProfiles(profilesData.profiles);

        const fieldsData = await fieldsRes.json();
        if (fieldsRes.ok) setFieldDefs(fieldsData.fields);
      } catch (err) {
        setError("Failed to load registration page.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [slug, id, router]);

  function toggleProfile(profileId) {
    setSelectedIds((prev) =>
      prev.includes(profileId)
        ? prev.filter((pid) => pid !== profileId)
        : [...prev, profileId],
    );
  }

  async function handleGoToStep2() {
    setStepError(null);

    if (selectedIds.length === 0) {
      setStepError("Select at least one person to register.");
      return;
    }

    setLoadingStep2(true);

    try {
      const res = await fetch(
        `/api/family/client-org-values?org_id=${org.id}&client_profile_ids=${selectedIds.join(",")}`,
      );
      const data = await res.json();

      const existingByProfile = res.ok ? data.profiles : {};

      const nextFormValues = {};
      for (const profileId of selectedIds) {
        const existing = existingByProfile[profileId] || null;
        const blank = {};
        for (const field of fieldDefs) {
          blank[field.field_key] = BLANK_VALUE_BY_TYPE[field.field_type] ?? "";
        }
        nextFormValues[profileId] = {
          values: { ...blank, ...(existing || {}) },
          hadExisting: !!existing,
        };
      }

      setFormValues(nextFormValues);
      setStep(2);
    } catch (err) {
      setStepError("Failed to load existing information. Please try again.");
    } finally {
      setLoadingStep2(false);
    }
  }

  function handleFieldChange(profileId, fieldKey, value) {
    setFormValues((prev) => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        values: { ...prev[profileId].values, [fieldKey]: value },
      },
    }));
  }

  function handleMultiselectToggle(profileId, fieldKey, option) {
    setFormValues((prev) => {
      const current = prev[profileId].values[fieldKey] || [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];

      return {
        ...prev,
        [profileId]: {
          ...prev[profileId],
          values: { ...prev[profileId].values, [fieldKey]: next },
        },
      };
    });
  }

  function handleGoToStep3() {
    setStepError(null);

    for (const profileId of selectedIds) {
      const values = formValues[profileId].values;
      for (const field of fieldDefs) {
        if (!field.required) continue;
        const value = values[field.field_key];
        const isEmpty =
          field.field_type === "multiselect"
            ? !value || value.length === 0
            : field.field_type === "checkbox"
              ? value !== true
              : !value;

        if (isEmpty) {
          setStepError(
            `Please fill in all required fields ("${field.label}") for each person.`,
          );
          return;
        }
      }
    }

    setStep(3);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: id,
          org_id: org.id,
          registrations: selectedIds.map((profileId) => ({
            client_profile_id: profileId,
            custom_values: formValues[profileId].values,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error);
        return;
      }

      setResult(data);
    } catch (err) {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(profileId, field) {
    const value = formValues[profileId].values[field.field_key];

    switch (field.field_type) {
      case "textarea":
        return (
          <textarea
            rows={3}
            value={value}
            onChange={(e) =>
              handleFieldChange(profileId, field.field_key, e.target.value)
            }
          />
        );
      case "select":
        return (
          <select
            value={value}
            onChange={(e) =>
              handleFieldChange(profileId, field.field_key, e.target.value)
            }
          >
            <option value="">Select...</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case "multiselect":
        return (
          <div className={styles.checkboxGroup}>
            {(field.options || []).map((option) => (
              <label key={option} className={styles.checkboxOption}>
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={() =>
                    handleMultiselectToggle(profileId, field.field_key, option)
                  }
                />
                {option}
              </label>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <label className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) =>
                handleFieldChange(profileId, field.field_key, e.target.checked)
              }
            />
            Yes
          </label>
        );
      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) =>
              handleFieldChange(profileId, field.field_key, e.target.value)
            }
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              handleFieldChange(profileId, field.field_key, e.target.value)
            }
          />
        );
    }
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>{error || "Event not found"}</p>
        <Link href={`/${slug}`}>Back to {org?.name || "organization"}</Link>
      </main>
    );
  }

  if (result) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Registration Submitted</h1>
          <p>
            {result.created.length} registration
            {result.created.length === 1 ? "" : "s"} submitted as pending.
          </p>
          {result.skipped.length > 0 && (
            <p className={styles.warning}>
              {result.skipped.length} profile
              {result.skipped.length === 1 ? " was" : "s were"} already
              registered for this event and skipped.
            </p>
          )}
          <div className={styles.formActions}>
            <Link
              href={`/${slug}/events/${id}`}
              className={styles.primaryButton}
            >
              Back to Event
            </Link>
            <Link href="/family/dashboard" className={styles.secondaryLink}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (profiles.length === 0) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <p>You need to add a person first.</p>
          <Link
            href="/family/profiles/new"
            className={styles.primaryButton}
          >
            Add a Person
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Link href={`/${slug}/events/${id}`} className={styles.backLink}>
        ← Back to Event
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>Register for {event.title}</h1>

        {stepError && <div className={styles.errorBanner}>{stepError}</div>}
        {submitError && (
          <div className={styles.errorBanner}>{submitError}</div>
        )}

        {step === 1 && (
          <div className={styles.stepSection}>
            <h2>Step 1: Who is registering?</h2>
            <div className={styles.checkboxGroup}>
              {profiles.map((profile) => (
                <label key={profile.id} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(profile.id)}
                    onChange={() => toggleProfile(profile.id)}
                  />
                  {profile.first_name} {profile.last_name}
                </label>
              ))}
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleGoToStep2}
              disabled={loadingStep2}
            >
              {loadingStep2 ? "Loading..." : "Next"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepSection}>
            <h2>Step 2: Additional Information</h2>

            {fieldDefs.length === 0 ? (
              <p>No additional information needed.</p>
            ) : (
              selectedIds.map((profileId) => {
                const profile = profiles.find((p) => p.id === profileId);
                const hadExisting = formValues[profileId]?.hadExisting;

                return (
                  <div key={profileId} className={styles.profileFieldGroup}>
                    <h3>
                      {profile.first_name} {profile.last_name}
                    </h3>
                    {hadExisting && (
                      <p className={styles.confirmNote}>
                        Please confirm your information is correct.
                      </p>
                    )}
                    {fieldDefs.map((field) => (
                      <div key={field.id} className={styles.formField}>
                        <label>
                          {field.label}
                          {field.required && " *"}
                        </label>
                        {renderField(profileId, field)}
                      </div>
                    ))}
                  </div>
                );
              })
            )}

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleGoToStep3}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.stepSection}>
            <h2>Step 3: Review and Submit</h2>

            {selectedIds.map((profileId) => {
              const profile = profiles.find((p) => p.id === profileId);
              const values = formValues[profileId].values;

              return (
                <div key={profileId} className={styles.reviewGroup}>
                  <h3>
                    {profile.first_name} {profile.last_name}
                  </h3>
                  {fieldDefs.length === 0 ? (
                    <p className={styles.reviewItem}>
                      No additional information required.
                    </p>
                  ) : (
                    fieldDefs.map((field) => {
                      const value = values[field.field_key];
                      const display =
                        field.field_type === "multiselect"
                          ? (value || []).join(", ") || "—"
                          : field.field_type === "checkbox"
                            ? value
                              ? "Yes"
                              : "No"
                            : value || "—";

                      return (
                        <p key={field.id} className={styles.reviewItem}>
                          <strong>{field.label}:</strong> {display}
                        </p>
                      );
                    })
                  )}
                </div>
              );
            })}

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setStep(2)}
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Registration"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
