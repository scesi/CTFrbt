"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useEventState } from "./EventState";
import styles from "./EventPause.module.css";

export default function EventPauseScreen() {
  const { config, ready, refresh } = useEventState();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const checkStatus = async () => {
    setChecking(true);
    setMessage("");
    const ok = await refresh();
    setMessage(
      ok
        ? "Status checked. The event is still paused."
        : "Could not check status. Check your connection and try again.",
    );
    setChecking(false);
  };
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <div className={styles.panel}>
        <p className={styles.label}>CTFrbt / EVENT STATUS</p>
        <h1>{ready ? "EVENT PAUSED" : "CONNECTING…"}</h1>
        <p>
          {ready
            ? "Take a break. Challenges and submissions are temporarily unavailable."
            : "Checking the competition status."}
        </p>
        {ready && config?.pausedUntil && (
          <p>
            Resumes at{" "}
            <strong>
              {new Date(config.pausedUntil).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </strong>{" "}
            (your local time)
          </p>
        )}
        <p className={styles.note}>This view updates automatically.</p>
        {message && <p role="status">{message}</p>}
        <div className={styles.actions}>
          <button
            className="btn"
            disabled={checking}
            onClick={() => void checkStatus()}
          >
            {checking ? "Checking…" : "Check status"}
          </button>
          <button
            className="btn"
            onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
