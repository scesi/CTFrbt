"use client";

import { useState, useEffect } from "react";

interface CRTEffects {
  scanlines: boolean;
  flicker: boolean;
  phosphor: boolean;
  glow: boolean;
  rollingScan: boolean;
}

export default function CRTSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [effects, setEffects] = useState<CRTEffects>({
    scanlines: true,
    flicker: true,
    phosphor: true,
    glow: true,
    rollingScan: true,
  });

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crtEffects");
      if (stored) {
        try {
          setEffects(JSON.parse(stored));
        } catch {
          // Corrupted data — clear and fall back to defaults
          localStorage.removeItem("crtEffects");
        }
      }
    }
  }, []);

  // Apply effect classes to body
  useEffect(() => {
    document.body.classList.toggle(
      "crt-scanlines-disabled",
      !effects.scanlines
    );
    document.body.classList.toggle("crt-flicker-disabled", !effects.flicker);
    document.body.classList.toggle("crt-phosphor-disabled", !effects.phosphor);
    document.body.classList.toggle("crt-glow-disabled", !effects.glow);
    document.body.classList.toggle(
      "crt-rolling-scan-disabled",
      !effects.rollingScan
    );
    localStorage.setItem("crtEffects", JSON.stringify(effects));
  }, [effects]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".crt-settings")) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleEffect = (key: keyof CRTEffects) => {
    setEffects((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const labels: Record<keyof CRTEffects, string> = {
    scanlines: "Scanlines",
    flicker: "Screen Flicker",
    phosphor: "Text Glow",
    glow: "Background Glow",
    rollingScan: "Rolling Scan",
  };

  return (
    <div className="crt-settings" style={{ position: "relative" }}>
      <button
        className="title-action-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={isOpen ? { borderColor: "var(--fg)", color: "var(--fg)" } : {}}
      >
        Settings
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "8px",
            width: "180px",
            background: "#000",
            border: "1px solid var(--border)",
            zIndex: 200,
          }}
        >
          {(Object.keys(labels) as (keyof CRTEffects)[]).map((key) => (
            <div
              key={key}
              onClick={() => toggleEffect(key)}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: "var(--fg-muted)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span>{labels[key]}</span>
              <span>{effects[key] ? "☑" : "☐"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
