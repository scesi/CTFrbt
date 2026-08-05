"use client";

import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import styles from "./AdminHeader.module.css";

interface AdminHeaderProps {
  onImportSettings: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportZip: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportSettings: () => void;
  onExportZip: () => void;
}

export default function AdminHeader({
  onImportSettings,
  onImportZip,
  onExportSettings,
  onExportZip,
}: AdminHeaderProps) {
  const importMenuRef = useRef<HTMLDetailsElement>(null);

  // The <details> only closes on Escape or summary click; this adds the
  // outside-click close for the Import menu.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        importMenuRef.current &&
        !importMenuRef.current.contains(e.target as Node)
      ) {
        importMenuRef.current.open = false;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const closeImportMenu = () => {
    if (importMenuRef.current) {
      importMenuRef.current.open = false;
    }
  };

  const handleLabelKeyDown = (e: KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  const handleExportSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const action = e.target.value;
    e.target.value = "";
    if (action === "zip") onExportZip();
    if (action === "json") onExportSettings();
  };

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Admin Panel</h1>
      <div className={styles.actions}>
        <input
          type="file"
          accept=".json"
          onChange={onImportSettings}
          className={styles.fileInput}
          id="import-json"
        />
        <input
          type="file"
          accept=".zip"
          onChange={onImportZip}
          className={styles.fileInput}
          id="import-zip"
        />

        <details
          ref={importMenuRef}
          className={`btn ${styles.select} ${styles.importMenu}`}
        >
          <summary className={styles.importSummary}>Import ▾</summary>
          <div className={styles.importMenuList}>
            <label
              htmlFor="import-zip"
              tabIndex={0}
              onClick={closeImportMenu}
              onKeyDown={handleLabelKeyDown}
              className={styles.importMenuItem}
            >
              Restore from ZIP
            </label>
            <label
              htmlFor="import-json"
              tabIndex={0}
              onClick={closeImportMenu}
              onKeyDown={handleLabelKeyDown}
              className={styles.importMenuItem}
            >
              Import Settings (JSON)
            </label>
          </div>
        </details>

        <select
          className={`btn btn-primary ${styles.select}`}
          defaultValue=""
          aria-label="Export actions"
          onChange={handleExportSelect}
        >
          <option value="" disabled>
            Export ▾
          </option>
          <option value="zip">Export All (ZIP)</option>
          <option value="json">Export Settings (JSON)</option>
        </select>
      </div>
    </div>
  );
}
