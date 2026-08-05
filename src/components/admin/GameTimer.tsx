"use client";

import { useEffect, useState, useCallback } from "react";

interface GameConfig {
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}

export default function GameTimer() {
  const [config, setConfig] = useState<GameConfig>({
    startTime: null,
    endTime: null,
    isActive: false,
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

  // Before start
  if (now < startTime) {
    const diff = startTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

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
        <span>CTF finalizado</span>
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
        <span>CTF en vivo - termina en:</span> {days > 0 && `${days}d `}{" "}
        {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m{" "}
        {String(seconds).padStart(2, "0")}s
      </div>
    );
  }

  // Infinite mode (no endTime)
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
      <span>CTF en vivo - modo infinito</span>
    </div>
  );
}
