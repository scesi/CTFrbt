"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import TimeInput24 from "../ui/TimeInput24";

interface GameConfig {
  startTime: string;
  endTime: string | null;
}

function pad(num: number): string {
  return String(num).padStart(2, "0");
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLocalTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function parseLocalDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr || !TIME_REGEX.test(timeStr)) return null;

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  if (!year || !month || !day) return null;
  if (isNaN(hours) || isNaN(minutes)) return null;

  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    d.getHours() !== hours ||
    d.getMinutes() !== minutes
  ) {
    return null;
  }

  if (isNaN(d.getTime())) return null;
  return d;
}

function getDefaultStart(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export default function GameConfiguration() {
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/game");
      if (!res.ok) {
        toast.error("Failed to load game config");
        return;
      }
      const data = await res.json();
      const config: GameConfig | null = data.config ?? null;

      if (config && config.startTime) {
        const start = new Date(config.startTime);
        setStartDate(formatLocalDate(start));
        setStartTime(formatLocalTime(start));

        if (config.endTime) {
          const end = new Date(config.endTime);
          setEndDate(formatLocalDate(end));
          setEndTime(formatLocalTime(end));
        } else {
          setEndDate("");
          setEndTime("");
        }
      } else {
        const start = getDefaultStart();
        setStartDate(formatLocalDate(start));
        setStartTime(formatLocalTime(start));
        setEndDate("");
        setEndTime("");
      }
    } catch {
      toast.error("Failed to load game config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const clearEnd = () => {
    setEndDate("");
    setEndTime("");
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !startTime) {
      toast.error("START date and time are required");
      return;
    }

    const startDateTime = parseLocalDateTime(startDate, startTime);
    if (!startDateTime) {
      toast.error("Invalid START: use HH:mm (00:00–23:59)");
      return;
    }

    let endDateTime: Date | null = null;
    if (endDate || endTime) {
      if (!endDate || !endTime) {
        toast.error(
          "Both END date and time must be provided, or leave both empty",
        );
        return;
      }
      endDateTime = parseLocalDateTime(endDate, endTime);
      if (!endDateTime) {
        toast.error("Invalid END: use HH:mm (00:00–23:59)");
        return;
      }
      if (endDateTime <= startDateTime) {
        toast.error("endTime must be after startTime");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime ? endDateTime.toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update game config");
        return;
      }

      if (data.config) {
        const start = new Date(data.config.startTime);
        setStartDate(formatLocalDate(start));
        setStartTime(formatLocalTime(start));

        if (data.config.endTime) {
          const end = new Date(data.config.endTime);
          setEndDate(formatLocalDate(end));
          setEndTime(formatLocalTime(end));
        } else {
          setEndDate("");
          setEndTime("");
        }
      }

      toast.success("Game config updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    minWidth: 0,
    fontSize: "13px",
    height: "38px",
    padding: "6px 10px",
  };

  const fieldBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--fg-dim)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    cursor: "pointer",
    padding: "6px 8px",
    whiteSpace: "nowrap",
    height: "38px",
  };

  const headerSpan: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--fg-dim)",
    fontFamily: "var(--font-mono)",
    display: "block",
  };

  const fieldRow: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
  };

  const dateWrapper: React.CSSProperties = {
    flex: "0 1 280px",
  };

  const timeWrapper: React.CSSProperties = {
    flex: "0 0 150px",
  };

  return (
    <div className="card">
      <h2
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "12px",
        }}
      >
        Game Configuration
      </h2>

      {loading ? (
        <div
          style={{
            fontSize: "12px",
            color: "var(--fg-dim)",
            fontFamily: "var(--font-mono)",
            minHeight: "120px",
            display: "flex",
            alignItems: "center",
          }}
        >
          Loading game config...
        </div>
      ) : (
        <form
          onSubmit={saveConfig}
          style={{
            width: "100%",
            maxWidth: "560px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <span style={headerSpan}>START</span>
            <div style={fieldRow}>
              <div style={dateWrapper}>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={saving}
                  required
                  aria-label="Start date"
                  style={inputStyle}
                />
              </div>
              <div style={timeWrapper}>
                <TimeInput24
                  value={startTime}
                  onChange={setStartTime}
                  disabled={saving}
                  required
                  ariaLabel="Start time in 24-hour format"
                />
              </div>
            </div>
          </section>

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <span style={headerSpan}>END (OPTIONAL)</span>
            <div style={fieldRow}>
              <div style={dateWrapper}>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={saving}
                  aria-label="End date"
                  style={inputStyle}
                />
              </div>
              <div style={timeWrapper}>
                <TimeInput24
                  value={endTime}
                  onChange={setEndTime}
                  disabled={saving}
                  ariaLabel="End time in 24-hour format"
                />
              </div>
              <button
                type="button"
                onClick={clearEnd}
                disabled={saving}
                style={fieldBtnStyle}
                aria-label="Clear end time"
              >
                clear end
              </button>
            </div>
          </section>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{
              alignSelf: "flex-start",
              width: "auto",
              fontSize: "12px",
              padding: "8px 16px",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      <div
        style={{
          marginTop: "12px",
          padding: "8px",
          border: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.02)",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "var(--fg-dim)",
            lineHeight: 1.6,
          }}
        >
          • Antes del inicio: Los retos estan ocultos y los envios estan
          bloqueados
          <br />
          • Durante el juego: Los retos son visibles y los envios son permitidos
          <br />
          • Despues del fin: Los retos permanecen visibles pero los envios estan
          bloqueados
          <br />• Sin hora de fin: La competencia continua indefinidamente
        </p>
      </div>
    </div>
  );
}
