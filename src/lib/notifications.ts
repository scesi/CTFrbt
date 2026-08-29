export type NotificationType = "freeze-warning" | "announcement";

export interface BaseNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  autoHide: boolean;
  autoHideDelay: number;
}

export interface FreezeWarningNotification extends BaseNotification {
  type: "freeze-warning";
  freezeAt: number; // timestamp when freeze occurs
  minutesRemaining: number;
}

export interface AnnouncementNotification extends BaseNotification {
  type: "announcement";
  title: string;
  content: string;
  announcementId: string;
}

export type Notification = FreezeWarningNotification | AnnouncementNotification;

export interface NotificationsResponse {
  notifications: Notification[];
  freezeAt: number | null;
  freezeMinutes: number;
  endTime: string | null;
}

export const NOTIFICATION_POLL_INTERVAL_MS = 10_000; // 10 seconds
export const FREEZE_WARNING_MINUTES_BEFORE = 5; // Show warning 5 minutes before freeze

export function isFreezeWarningActive(
  endTime: string | null,
  freezeMinutes: number,
  now: number,
): { active: boolean; minutesRemaining: number; freezeAt: number } {
  if (!endTime || freezeMinutes <= 0) {
    return { active: false, minutesRemaining: 0, freezeAt: 0 };
  }

  const end = new Date(endTime).getTime();
  const freezeAt = end - freezeMinutes * 60 * 1000;
  const warningAt = freezeAt - FREEZE_WARNING_MINUTES_BEFORE * 60 * 1000;

  if (now >= warningAt && now < freezeAt) {
    const minutesRemaining = Math.ceil((freezeAt - now) / 60000);
    return { active: true, minutesRemaining, freezeAt };
  }

  if (now >= freezeAt) {
    return { active: true, minutesRemaining: 0, freezeAt };
  }

  return { active: false, minutesRemaining: 0, freezeAt };
}

export function createFreezeWarningNotification(
  minutesRemaining: number,
  freezeAt: number,
): FreezeWarningNotification {
  const id = `freeze-${freezeAt}`;
  const message =
    minutesRemaining > 0
      ? `Leaderboard se congelará en ${minutesRemaining} minuto${minutesRemaining !== 1 ? "s" : ""}`
      : "Leaderboard congelado — solo admins ven actualizaciones en tiempo real";

  return {
    id,
    type: "freeze-warning",
    message,
    timestamp: Date.now(),
    autoHide: true,
    autoHideDelay: 10_000,
    freezeAt,
    minutesRemaining,
  };
}

export function createAnnouncementNotification(announcement: {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}): AnnouncementNotification {
  return {
    id: `announcement-${announcement.id}`,
    type: "announcement",
    title: announcement.title,
    content: announcement.content,
    message: announcement.title,
    timestamp: new Date(announcement.createdAt).getTime(),
    autoHide: true,
    autoHideDelay: 10_000,
    announcementId: announcement.id,
  };
}
