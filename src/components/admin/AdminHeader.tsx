"use client";

import { useEffect, useRef, type ChangeEvent } from "react";
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
  const importDetailsRef = useRef<HTMLDetailsElement>(null);
  const exportDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        importDetailsRef.current?.contains(target) ||
        exportDetailsRef.current?.contains(target)
      ) {
        return;
      }
      if (importDetailsRef.current) importDetailsRef.current.open = false;
      if (exportDetailsRef.current) exportDetailsRef.current.open = false;
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pickJson = () => {
    if (importDetailsRef.current) importDetailsRef.current.open = false;
    jsonInputRef.current?.click();
  };

  const pickZip = () => {
    if (importDetailsRef.current) importDetailsRef.current.open = false;
    zipInputRef.current?.click();
  };

  const runExport = (action: () => void) => {
    if (exportDetailsRef.current) exportDetailsRef.current.open = false;
    action();
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

        <details ref={importDetailsRef} className={styles.menuWrapper}>
          <summary className={`btn ${styles.actionButton} ${styles.summary}`}>
            Import <span className={styles.caret}>▾</span>
          </summary>
          <div className={styles.menu}>
            <button className={styles.menuItem} onClick={pickZip}>
              Restore from ZIP
            </button>
            <button className={styles.menuItem} onClick={pickJson}>
              Import Settings (JSON)
            </button>
          </div>
        </details>

        <details ref={exportDetailsRef} className={styles.menuWrapper}>
          <summary
            className={`btn btn-primary ${styles.actionButton} ${styles.summary}`}
          >
            Export <span className={styles.caret}>▾</span>
          </summary>
          <div className={styles.menu}>
            <button
              className={styles.menuItem}
              onClick={() => runExport(onExportZip)}
            >
              Export All (ZIP)
            </button>
            <button
              className={styles.menuItem}
              onClick={() => runExport(onExportSettings)}
            >
              Export Settings (JSON)
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
