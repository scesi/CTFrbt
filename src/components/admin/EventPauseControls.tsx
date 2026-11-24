"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { useEventState } from "../event/EventState";

export default function EventPauseControls() {
  const { config, paused, refresh, ready } = useEventState();
  const [minutes, setMinutes] = useState("60");
  const [saving, setSaving] = useState(false);

  const changePause = async () => {
    const duration = Number(minutes);
    if (
      !paused &&
      (!Number.isInteger(duration) || duration < 1 || duration > 1440)
    ) {
      toast.error("Choose a duration between 1 and 1440 minutes");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/game", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          paused
            ? { action: "resume" }
            : { action: "pause", minutes: duration },
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Could not update pause");
        return;
      }
      await refresh();
      toast.success(paused ? "Event resumed" : "Event paused");
    } catch {
      toast.error("Could not update pause");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="card"
      aria-labelledby="event-pause-title"
      style={{ marginTop: 16 }}
    >
      <h2 id="event-pause-title" style={{ fontSize: 14, marginBottom: 12 }}>
        Event pause
      </h2>
      <p
        style={{
          fontSize: 12,
          color: paused ? "var(--warning)" : "var(--fg-muted)",
          marginBottom: 12,
        }}
      >
        {paused && config?.pausedUntil
          ? `PAUSED — resumes at ${new Date(config.pausedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} (local time)`
          : "Hide event content and block participant actions during a break."}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "end",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {!paused && (
          <label style={{ fontSize: 12 }}>
            Duration (minutes)
            <input
              className="form-input"
              type="number"
              min="1"
              max="1440"
              step="1"
              value={minutes}
              disabled={saving}
              onChange={(e) => setMinutes(e.target.value)}
              style={{ display: "block", width: 160, marginTop: 6 }}
            />
          </label>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving || !ready || !config}
          onClick={() => void changePause()}
        >
          {saving ? "Saving…" : paused ? "Resume event" : "Pause event"}
        </button>
      </div>
      <p
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          marginTop: 12,
          lineHeight: 1.6,
        }}
      >
        Resumes automatically. The competition end time stays unchanged; the
        break cannot extend past it. Administrators keep access. Downloaded
        files and external challenge services are not stopped.
      </p>
    </section>
  );
}
