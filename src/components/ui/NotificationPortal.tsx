"use client";

import { useNotifications } from "@/hooks/useNotifications";
import NotificationToast from "./NotificationToast";

export default function NotificationPortal() {
  const { notifications, dismissNotification, isLoading } = useNotifications();

  if (isLoading || notifications.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "flex-end",
      }}
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
}
