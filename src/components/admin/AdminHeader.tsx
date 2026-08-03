"use client";

import { useRef, type ChangeEvent } from "react";
import styles from "./AdminHeader.module.css";

interface AdminHeaderProps {
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

export default function AdminHeader({ onImport, onExport }: AdminHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Admin Panel</h1>
      <div className={styles.actions}>
        <input
          type="file"
          accept=".json"
          onChange={onImport}
          className={styles.fileInput}
          ref={fileInputRef}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`btn ${styles.actionButton}`}
        >
          Import
        </button>
        <button
          onClick={onExport}
          className={`btn btn-primary ${styles.actionButton}`}
        >
          Export All
        </button>
      </div>
    </div>
  );
}
