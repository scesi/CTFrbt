"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import styles from "./AdminHeader.module.css";

interface AdminHeaderProps {
  onImportSettings: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportZip: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportSettings: () => void;
  onExportZip: () => void;
}

type MenuKey = "import" | "export" | null;

export default function AdminHeader({
  onImportSettings,
  onImportZip,
  onExportSettings,
  onExportZip,
}: AdminHeaderProps) {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickJson = () => {
    setOpenMenu(null);
    jsonInputRef.current?.click();
  };

  const pickZip = () => {
    setOpenMenu(null);
    zipInputRef.current?.click();
  };

  return (
    <div className={styles.header} ref={headerRef}>
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

        <div className={styles.menuWrapper}>
          <button
            onClick={() => setOpenMenu(openMenu === "import" ? null : "import")}
            className={`btn ${styles.actionButton}`}
            aria-expanded={openMenu === "import"}
          >
            Import <span className={styles.caret}>▾</span>
          </button>
          {openMenu === "import" && (
            <div className={styles.menu}>
              <button className={styles.menuItem} onClick={pickZip}>
                Restore from ZIP
              </button>
              <button className={styles.menuItem} onClick={pickJson}>
                Import Settings (JSON)
              </button>
            </div>
          )}
        </div>

        <div className={styles.menuWrapper}>
          <button
            onClick={() => setOpenMenu(openMenu === "export" ? null : "export")}
            className={`btn btn-primary ${styles.actionButton}`}
            aria-expanded={openMenu === "export"}
          >
            Export <span className={styles.caret}>▾</span>
          </button>
          {openMenu === "export" && (
            <div className={styles.menu}>
              <button
                className={styles.menuItem}
                onClick={() => {
                  setOpenMenu(null);
                  onExportZip();
                }}
              >
                Export All (ZIP)
              </button>
              <button
                className={styles.menuItem}
                onClick={() => {
                  setOpenMenu(null);
                  onExportSettings();
                }}
              >
                Export Settings (JSON)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
