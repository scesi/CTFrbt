"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface EventConfig {
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  leaderboardFreezeMinutes: number | null;
  pausedUntil: string | null;
}
interface Snapshot {
  gameConfig: EventConfig | null;
  serverNow: string;
}
const EventContext = createContext<{
  config: EventConfig | null;
  paused: boolean;
  ready: boolean;
  clockOffset: number;
  refresh: () => Promise<void>;
} | null>(null);

// One poll per visible tab, shared by the gate, timers and admin controls.
export function EventStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    inFlight.current = (async () => {
      try {
        const response = await fetch("/api/game", { cache: "no-store" });
        if (!response.ok) return;
        const data: Snapshot = await response.json();
        setClockOffset(Date.parse(data.serverNow) - Date.now());
        setSnapshot(data);
      } catch {
        /* Retain last known state on a transient connection failure. */
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  const config = snapshot?.gameConfig ?? null;
  // Only a server response can lift the gate; changing the device clock cannot.
  const paused = !!(
    config?.pausedUntil &&
    snapshot &&
    Date.parse(config.pausedUntil) > Date.parse(snapshot.serverNow)
  );
  useEffect(() => {
    if (!paused || !config?.pausedUntil || !snapshot) return;
    const delay = Math.max(
      100,
      Date.parse(config.pausedUntil) - Date.parse(snapshot.serverNow) + 100,
    );
    const timer = window.setTimeout(() => void refresh(), delay);
    return () => window.clearTimeout(timer);
  }, [paused, config?.pausedUntil, snapshot, refresh]);

  return (
    <EventContext.Provider
      value={{ config, paused, ready: snapshot !== null, clockOffset, refresh }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEventState() {
  const value = useContext(EventContext);
  if (!value) throw new Error("EventStateProvider is required");
  return value;
}
