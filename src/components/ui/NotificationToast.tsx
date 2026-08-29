"use client";

import React, { useEffect, useState } from "react";
import { Notification } from "@/lib/notifications";

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

export default function NotificationToast({
  notification,
  onDismiss,
}: NotificationToastProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!notification.autoHide) return;

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        onDismiss(notification.id);
      }, 300);
    }, notification.autoHideDelay);

    return () => clearTimeout(timer);
  }, [
    notification.autoHide,
    notification.autoHideDelay,
    notification.id,
    onDismiss,
  ]);

  if (!visible) return null;

  const isFreeze = notification.type === "freeze-warning";
  const bgColor = isFreeze
    ? "rgba(255, 184, 0, 0.15)"
    : "rgba(255, 255, 255, 0.06)";
  const borderColor = isFreeze ? "var(--neon-amber)" : "var(--border-hover)";
  const iconColor = isFreeze ? "var(--neon-amber)" : "var(--fg)";
  const icon = isFreeze ? "!" : ">|";

  return (
    <div
      style={{
        maxWidth: "360px",
        padding: "12px 16px",
        border: `1px solid ${borderColor}`,
        borderRadius: "0",
        background: bgColor,
        color: "var(--fg)",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        lineHeight: 1.5,
        boxShadow: `0 4px 12px ${isFreeze ? "rgba(255, 184, 0, 0.2)" : "rgba(255, 255, 255, 0.08)"}`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateX(20px)" : "translateX(0)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: exiting ? "none" : "auto",
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <span
          style={{
            fontSize: "16px",
            color: iconColor,
            flexShrink: 0,
            marginTop: "1px",
          }}
        >
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {notification.type === "announcement" && (
            <div
              style={{
                fontWeight: 600,
                fontSize: "13px",
                marginBottom: "4px",
                color: "var(--fg)",
              }}
            >
              {notification.title}
            </div>
          )}
          <div
            style={{
              fontSize: "12px",
              color: "var(--fg-muted)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {notification.type === "announcement"
              ? notification.content
              : notification.message}
          </div>
        </div>
        <button
          onClick={() => {
            setExiting(true);
            setTimeout(() => {
              setVisible(false);
              onDismiss(notification.id);
            }, 300);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--fg-dim)",
            cursor: "pointer",
            padding: "2px 6px",
            fontSize: "14px",
            lineHeight: 1,
            flexShrink: 0,
            marginTop: "-4px",
            marginRight: "-4px",
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
