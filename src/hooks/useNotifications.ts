"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Notification,
  isFreezeWarningActive,
  NOTIFICATION_POLL_INTERVAL_MS,
} from "@/lib/notifications";

interface UseNotificationsReturn {
  notifications: Notification[];
  dismissNotification: (id: string) => void;
  isLoading: boolean;
}

export function useNotifications(): UseNotificationsReturn {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dismissedRef = useRef<Set<string>>(new Set());
  const lastAnnouncementIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const dismissNotification = useCallback((id: string) => {
    dismissedRef.current.add(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const [gameRes, announcementsRes] = await Promise.all([
        fetch("/api/game", { cache: "no-store" }),
        fetch("/api/announcements", { cache: "no-store" }),
      ]);

      if (!gameRes.ok || !announcementsRes.ok) return;

      const [gameData, announcementsData] = await Promise.all([
        gameRes.json(),
        announcementsRes.json(),
      ]);

      const gameConfig = gameData.gameConfig;
      const announcements = announcementsData.announcements || [];

      const endTime = gameConfig?.endTime || null;
      const freezeMinutes = gameConfig?.leaderboardFreezeMinutes ?? 0;

      const newNotifications: Notification[] = [];

      // Check freeze warning
      const freezeWarning = isFreezeWarningActive(endTime, freezeMinutes, Date.now());
      if (freezeWarning.active && !isAdmin) {
        const freezeNotif = (() => {
          if (freezeWarning.minutesRemaining > 0) {
            return {
              id: `freeze-${freezeWarning.freezeAt}`,
              type: "freeze-warning" as const,
              message: `Leaderboard se congelará en ${freezeWarning.minutesRemaining} minuto${freezeWarning.minutesRemaining !== 1 ? "s" : ""}`,
              timestamp: Date.now(),
              autoHide: true,
              autoHideDelay: 10_000,
              freezeAt: freezeWarning.freezeAt,
              minutesRemaining: freezeWarning.minutesRemaining,
            };
          } else {
            return {
              id: `freeze-${freezeWarning.freezeAt}`,
              type: "freeze-warning" as const,
              message: "Leaderboard congelado — solo admins ven actualizaciones en tiempo real",
              timestamp: Date.now(),
              autoHide: true,
              autoHideDelay: 10_000,
              freezeAt: freezeWarning.freezeAt,
              minutesRemaining: 0,
            };
          }
        })();

        if (!dismissedRef.current.has(freezeNotif.id)) {
          newNotifications.push(freezeNotif);
        }
      }

      // Check announcements
      for (const announcement of announcements) {
        const id = `announcement-${announcement.id}`;
        if (!lastAnnouncementIdsRef.current.has(id) && !dismissedRef.current.has(id)) {
          newNotifications.push({
            id,
            type: "announcement",
            title: announcement.title,
            content: announcement.content,
            message: announcement.title,
            timestamp: new Date(announcement.createdAt).getTime(),
            autoHide: true,
            autoHideDelay: 10_000,
            announcementId: announcement.id,
          });
          lastAnnouncementIdsRef.current.add(id);
        }
      }

      if (newNotifications.length > 0) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const combined = [...prev];
          for (const n of newNotifications) {
            if (!existingIds.has(n.id)) {
              combined.push(n);
            }
          }
          // Keep only latest 5 notifications
          return combined.slice(-5);
        });
      }

      if (isLoading) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      if (isLoading) {
        setIsLoading(false);
      }
    }
  }, [isAdmin, isLoading]);

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Set up polling
    intervalRef.current = setInterval(fetchNotifications, NOTIFICATION_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNotifications, isLoading]);

  return {
    notifications,
    dismissNotification,
    isLoading,
  };
}