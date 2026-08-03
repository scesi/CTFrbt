"use client";

import type { FormEvent } from "react";
import LoadingSpinner from "./loading/LoadingSpinner";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface AnnouncementsViewProps {
  title: string;
  content: string;
  announcements: Announcement[];
  loading: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string, title: string) => void;
}

export default function AnnouncementsView({
  title,
  content,
  announcements,
  loading,
  onTitleChange,
  onContentChange,
  onSubmit,
  onDelete,
}: AnnouncementsViewProps) {
  return (
    <>
      <div className="card" style={{ marginBottom: "20px" }}>
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          New Announcement
        </h2>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Title"
            required
            style={{ marginBottom: "8px" }}
          />
          <textarea
            className="form-input"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Content"
            required
            rows={3}
            style={{ marginBottom: "8px", resize: "vertical" }}
          />
          <button type="submit" className="btn btn-primary">
            Publish
          </button>
        </form>
      </div>

      {/* Announcements List */}
      <div className="card">
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Published Announcements
        </h2>
        {loading ? (
          <LoadingSpinner />
        ) : announcements.length === 0 ? (
          <p style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
            No announcements yet
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                style={{
                  border: "1px solid var(--border)",
                  padding: "12px",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        marginBottom: "4px",
                      }}
                    >
                      {announcement.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--fg-muted)",
                        lineHeight: 1.5,
                        marginBottom: "6px",
                      }}
                    >
                      {announcement.content}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--fg-dim)" }}>
                      Created:{" "}
                      {new Date(announcement.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      onDelete(announcement.id, announcement.title)
                    }
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--danger)",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      padding: "4px 8px",
                      borderRadius: "0",
                    }}
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
