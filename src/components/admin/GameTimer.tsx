"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";

interface GameConfig {
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  leaderboardFreezeMinutes: number | null;
}

type GameTimerVariant = "titlebar" | "statusbar" | "full";

interface GameTimerProps {
  variant?: GameTimerVariant;
  isAdmin?: boolean;
  session?: Session | null;
}

export default function GameTimer({
  variant = "full",
  isAdmin = false,
  session,
}: GameTimerProps) {
  const { data: sessionData } = useSession();
  const sessionToUse = session ?? sessionData;
  const isAdminUser = isAdmin || sessionToUse?.user?.isAdmin;
  const [config, setConfig] = useState<GameConfig>({
    startTime: null,
    endTime: null,
    isActive: false,
    leaderboardFreezeMinutes: null,
  });
  const [now, setNow] = useState(new Date());

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/game", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.gameConfig) {
        setConfig({
          startTime: data.gameConfig.startTime || null,
          endTime: data.gameConfig.endTime || null,
          isActive: data.gameConfig.isActive ?? false,
          leaderboardFreezeMinutes:
            data.gameConfig.leaderboardFreezeMinutes ?? null,
        });
      }
    } catch {
      // Silently fail - timer just won't show
    }
  }, []);

  useEffect(() => {
    loadConfig();
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [loadConfig]);

  if (!config.startTime) return null;

  const startTime = new Date(config.startTime);
  const endTime = config.endTime ? new Date(config.endTime) : null;
  const freezeMinutes = config.leaderboardFreezeMinutes ?? 0;
  const freezeAt =
    endTime && freezeMinutes > 0
      ? new Date(endTime.getTime() - freezeMinutes * 60 * 1000)
      : null;
  const isFrozen = freezeAt && now >= freezeAt;
  const isFreezeWarning =
    freezeAt &&
    !isFrozen &&
    now >= new Date(freezeAt.getTime() - 5 * 60 * 1000);

  // Before start
  if (now < startTime) {
    const diff = startTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const timeStr = `${days > 0 ? `${days}d ` : ""}${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

    if (variant === "titlebar") return null;
    if (variant === "statusbar") return <span>CTF starts in: {timeStr}</span>;

    return (
      <div
        style={{
          padding: "8px 12px",
          border: "1px solid var(--border)",
          marginBottom: "12px",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          color: "var(--fg-dim)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <span style={{ color: "var(--accent)" }}>CTF starts in:</span>{" "}
        {days > 0 && `${days}d `} {String(hours).padStart(2, "0")}h{" "}
        {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
      </div>
    );
  }

  // After end (with endTime)
  if (endTime && now > endTime) {
    if (variant === "titlebar") return null;
    if (variant === "statusbar") return <span>CTF ended</span>;

    return (
      <div
        style={{
          padding: "8px 12px",
          border: "1px solid var(--border)",
          marginBottom: "12px",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          color: "var(--danger)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <span>CTF ended</span>
      </div>
    );
  }

  // During game
  if (endTime) {
    const diff = endTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const timeStr = `${days > 0 ? `${days}d ` : ""}${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

    // Title bar variant: only show freeze warning
    if (variant === "titlebar") {
      if (!freezeAt) return null;

      if (isFrozen) {
        return (
          <span
            style={{
              color: "var(--neon-amber)",
              marginLeft: "8px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
            }}
          >
            Scoreboard frozen
          </span>
        );
      }

      if (isFreezeWarning) {
        const minsLeft = Math.ceil(
          (freezeAt!.getTime() - now.getTime()) / 60000,
        );
        return (
          <span
            style={{
              color: "var(--neon-amber)",
              marginLeft: "8px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
            }}
          >
            Scoreboard closing in {minsLeft} min
          </span>
        );
      }

      return null;
    }

    // Status bar variant: show timer only
    if (variant === "statusbar") {
      return (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
          CTF Live - ends in: {timeStr}
        </span>
      );
    }

    // Full variant (admin dashboard)
    const freezeInfo =
      freezeAt &&
      !isFrozen &&
      now >= new Date(freezeAt.getTime() - 5 * 60 * 1000) ? (
        <span style={{ color: "var(--neon-amber)", marginLeft: "8px" }}>
          ⚠ Scoreboard closing in{" "}
          {Math.ceil((freezeAt.getTime() - now.getTime()) / 60000)} min
        </span>
      ) : freezeAt && isFrozen ? (
        <span style={{ color: "var(--neon-amber)", marginLeft: "8px" }}>
          ⚠ Scoreboard FROZEN for participants
        </span>
      ) : null;

    return (
      <div
        style={{
          padding: "8px 12px",
          border: "1px solid var(--border)",
          marginBottom: "12px",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          color: "var(--success)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <span>CTF Live - ends in:</span> {days > 0 && `${days}d `}{" "}
        {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m{" "}
        {String(seconds).padStart(2, "0")}s{freezeInfo}
        {isAdminUser && freezeAt && (
          <span
            style={{
              color: "var(--fg-dim)",
              marginLeft: "8px",
              fontSize: "11px",
            }}
          >
            | Freeze at: {freezeAt.toLocaleTimeString()} ({freezeMinutes} min
            before end)
          </span>
        )}
      </div>
    );
  }

  // Infinite mode (no endTime)
  if (variant === "titlebar") return null;
  if (variant === "statusbar") return <span>CTF Live - infinite mode</span>;

  return (
    <div
      style={{
        padding: "8px 12px",
        border: "1px solid var(--border)",
        marginBottom: "12px",
        fontSize: "12px",
        fontFamily: "var(--font-mono)",
        color: "var(--success)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <span>CTF Live - infinite mode</span>
    </div>
  );
}
