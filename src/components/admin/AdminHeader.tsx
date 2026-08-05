"use client";

import { useRef, type ChangeEvent } from "react";
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
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleImportSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const action = e.target.value;
    e.target.value = "";
    if (action === "zip") zipInputRef.current?.click();
    if (action === "json") jsonInputRef.current?.click();
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
          ref={jsonInputRef}
        />
        <input
          type="file"
          accept=".zip"
          onChange={onImportZip}
          className={styles.fileInput}
          ref={zipInputRef}
        />

        <select
          className={`btn ${styles.select}`}
          defaultValue=""
          aria-label="Import actions"
          onChange={handleImportSelect}
        >
          <option value="" disabled>
            Import ▾
          </option>
          <option value="zip">Restore from ZIP</option>
          <option value="json">Import Settings (JSON)</option>
        </select>

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
