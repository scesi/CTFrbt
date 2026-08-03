"use client";

import { useRef, type ChangeEvent } from "react";

interface AdminHeaderProps {
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

export default function AdminHeader({ onImport, onExport }: AdminHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
      }}
    >
      <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Admin Panel</h1>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="file"
          accept=".json"
          onChange={onImport}
          style={{ display: "none" }}
          ref={fileInputRef}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn"
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          Import
        </button>
        <button
          onClick={onExport}
          className="btn btn-primary"
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          Export All
        </button>
      </div>
    </div>
  );
}
