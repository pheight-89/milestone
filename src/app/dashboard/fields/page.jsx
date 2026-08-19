"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./fields.module.css";

const FIELD_TYPE_LABELS = {
  text: "Text",
  textarea: "Text Area",
  select: "Select",
  multiselect: "Multi-Select",
  checkbox: "Checkbox",
  date: "Date",
};

export default function ClientFieldsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    field_type: "text",
    options: "",
    required: false,
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok) {
          router.push("/login");
          return;
        }

        setUser(data.user);

        if (data.user.role === "admin") {
          const fieldsRes = await fetch("/api/fields");
          const fieldsData = await fieldsRes.json();
          if (fieldsRes.ok) {
            setFields(fieldsData.fields);
          } else {
            setError(fieldsData.error);
          }
        }
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  function handleFormChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setFormError(null);

    const needsOptions =
      formData.field_type === "select" || formData.field_type === "multiselect";
    const parsedOptions = needsOptions
      ? formData.options
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : undefined;

    if (needsOptions && parsedOptions.length === 0) {
      setFormError("Add at least one option, one per line.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formData.label,
          field_type: formData.field_type,
          options: parsedOptions,
          required: formData.required,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error);
        return;
      }

      setFields((prev) => [...prev, data.field]);
      setFormData({ label: "", field_type: "text", options: "", required: false });
      setShowAddForm(false);
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this field? This cannot be undone.")) return;

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/fields/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      setFields((prev) => prev.filter((field) => field.id !== id));
    } catch (err) {
      setError("Failed to delete field.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMove(index, direction) {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const current = fields[index];
    const target = fields[targetIndex];

    setReordering(true);
    setError(null);

    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/fields/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: target.sort_order }),
        }),
        fetch(`/api/fields/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: current.sort_order }),
        }),
      ]);

      if (!res1.ok || !res2.ok) {
        setError("Failed to reorder fields.");
        return;
      }

      setFields((prev) => {
        const next = [...prev];
        next[index] = { ...target, sort_order: current.sort_order };
        next[targetIndex] = { ...current, sort_order: target.sort_order };
        return next;
      });
    } catch (err) {
      setError("Failed to reorder fields.");
    } finally {
      setReordering(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>Loading...</p>
      </main>
    );
  }

  if (user?.role !== "admin") {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <p>This page is for admins only.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Client Fields</h1>
          <p className={styles.subtitle}>
            Define what information you collect on client profiles.
          </p>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.fieldsListHeader}>
          <h2>Fields</h2>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            {showAddForm ? "Cancel" : "Add Field"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddSubmit} className={styles.addForm}>
            {formError && <div className={styles.errorBanner}>{formError}</div>}

            <div className={styles.formField}>
              <label htmlFor="label">Label</label>
              <input
                type="text"
                id="label"
                value={formData.label}
                onChange={(e) => handleFormChange("label", e.target.value)}
                placeholder="e.g. Dietary Restrictions"
                required
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="field_type">Field Type</label>
              <select
                id="field_type"
                value={formData.field_type}
                onChange={(e) => handleFormChange("field_type", e.target.value)}
              >
                <option value="text">Text</option>
                <option value="textarea">Text Area</option>
                <option value="select">Select (single choice)</option>
                <option value="multiselect">Multi-Select</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Date</option>
              </select>
            </div>

            {(formData.field_type === "select" ||
              formData.field_type === "multiselect") && (
              <div className={styles.formField}>
                <label htmlFor="options">Options (one per line)</label>
                <textarea
                  id="options"
                  rows={4}
                  value={formData.options}
                  onChange={(e) => handleFormChange("options", e.target.value)}
                  placeholder={"Option A\nOption B\nOption C"}
                />
              </div>
            )}

            <div className={styles.checkboxField}>
              <input
                type="checkbox"
                id="required"
                checked={formData.required}
                onChange={(e) => handleFormChange("required", e.target.checked)}
              />
              <label htmlFor="required">Required on client profile</label>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Field"}
            </button>
          </form>
        )}

        {fields.length === 0 && !showAddForm ? (
          <p className={styles.emptyState}>No fields defined yet.</p>
        ) : (
          <div className={styles.fieldsList}>
            {fields.map((field, index) => (
              <div key={field.id} className={styles.fieldRow}>
                <div className={styles.fieldInfo}>
                  <span className={styles.fieldLabel}>{field.label}</span>
                  <span className={styles.typeBadge}>
                    {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                  </span>
                  {field.required && (
                    <span className={styles.requiredBadge}>Required</span>
                  )}
                </div>
                <div className={styles.fieldActions}>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0 || reordering}
                    className={styles.moveButton}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "down")}
                    disabled={index === fields.length - 1 || reordering}
                    className={styles.moveButton}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(field.id)}
                    disabled={deletingId === field.id}
                    className={styles.deleteButton}
                  >
                    {deletingId === field.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
