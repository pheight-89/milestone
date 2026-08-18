"use client";
import { useState } from "react";
import styles from "./SearchableMultiSelect.module.css";

export default function SearchableMultiSelect({
  items,
  onChange,
  placeholder,
  selected = [],
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = items.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) &&
      !selected.find((s) => s.id === item.id),
  );

  function handleSelect(item) {
    onChange([...selected, item]);
    setQuery("");
    setOpen(false);
  }

  function handleRemove(id) {
    onChange(selected.filter((s) => s.id !== id));
  }

  return (
    <div className={styles.container}>
      <div className={styles.tags}>
        {selected.map((item) => (
          <span key={item.id} className={styles.tag}>
            {item.label}
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className={styles.removeTag}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={selected.length === 0 ? placeholder : "Add another..."}
        className={styles.input}
      />
      {open && filtered.length > 0 && (
        <ul className={styles.dropdown}>
          {filtered.map((item) => (
            <li
              key={item.id}
              onMouseDown={() => handleSelect(item)}
              className={styles.option}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
