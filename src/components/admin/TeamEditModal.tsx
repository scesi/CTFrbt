"use client";

import { useEffect, useState, useRef } from "react";
import TeamIcon from "../ui/TeamIcon";
import TeamIconSelector from "./TeamIconSelector";

export interface Team {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
  };
}

interface TeamEditModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: {
    name: string;
    icon: string;
    color: string;
    code: string;
  }) => Promise<void>;
}

const DEFAULT_ICON = "GiSpaceship";
const DEFAULT_COLOR = "#ffffff";

export default function TeamEditModal({
  team,
  isOpen,
  onClose,
  onSave,
}: TeamEditModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [code, setCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setIcon(team.icon || DEFAULT_ICON);
      setColor(team.color || DEFAULT_COLOR);
      setCode(team.code);
      setError(null);
    }
  }, [team]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (!isSaving && e.key === "Escape") {
        onClose();
      }
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (
        !isSaving &&
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleBackdropClick);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleBackdropClick);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isSaving, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !team) return;

    setError(null);
    setIsSaving(true);

    try {
      await onSave({ name, icon, color, code });
      onClose();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update team";
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!isSaving) {
      onClose();
    }
  };

  if (!isOpen || !team) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Team"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--terminal-radius)",
          width: "calc(100% - 32px)",
          maxWidth: "620px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "20px",
          boxShadow: "0 0 20px rgba(0, 100, 255, 0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "14px",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            marginBottom: "16px",
            color: "var(--fg)",
            letterSpacing: "0.5px",
          }}
        >
          Edit Team: {team.name}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label
              htmlFor="teamName"
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--fg-dim)",
                marginBottom: "4px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              disabled={isSaving}
              style={{ width: "100%", fontSize: "13px" }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label
              htmlFor="teamCode"
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--fg-dim)",
                marginBottom: "4px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Team Code
            </label>
            <input
              id="teamCode"
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={12}
              disabled={isSaving}
              placeholder="up to 12 characters"
              style={{
                width: "100%",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--fg-dim)",
                marginBottom: "4px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Team Icon
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                <TeamIcon name={icon} color={color} size={24} />
              </div>
            </div>
            <TeamIconSelector value={icon} color={color} onChange={setIcon} />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--fg-dim)",
                marginBottom: "4px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Team Color
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  border: "1px solid var(--border)",
                  background: color,
                  flexShrink: 0,
                }}
              />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isSaving}
                style={{
                  width: "100%",
                  height: "28px",
                  padding: 0,
                  cursor: "pointer",
                }}
              />
              <input
                type="text"
                className="form-input"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isSaving}
                style={{
                  width: "calc(100% - 76px)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "12px",
              marginBottom: "12px",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                color: "var(--fg-dim)",
                fontFamily: "var(--font-mono)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Preview
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <TeamIcon name={icon} color={color} size={32} />
              <span style={{ color: color, fontWeight: 500 }}>
                {name || "Team name"}
              </span>
              <code
                style={{
                  fontSize: "11px",
                  color: "var(--fg-dim)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                [{code || "CODE"}]
              </code>
            </div>
          </div>

          {error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                marginBottom: "12px",
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              borderTop: "1px solid var(--border)",
              paddingTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--fg-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                cursor: "pointer",
                padding: "8px 16px",
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--success)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                cursor: "pointer",
                padding: "8px 16px",
                opacity: isSaving ? 0.5 : 1,
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.borderColor = "var(--border-hover)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {isSaving ? "saving..." : "save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
