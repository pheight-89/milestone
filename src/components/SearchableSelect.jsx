"use client";
import { useState } from "react";
import styles from "./SearchableSelect.module.css";

export default function SearchableSelect({
  items,
  onSelect,
  placeholder,
  selected,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  function handleSelect(item) {
    onSelect(item);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={styles.container}>
      <input
        type="text"
        value={selected ? selected.label : query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onSelect(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
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
