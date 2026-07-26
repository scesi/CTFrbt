"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  teamId: string | null;
  createdAt: string;
  team: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export default function LogsView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs");
      if (!res.ok) {
        toast.error("Failed to load logs");
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
          Activity Logs ({logs.length})
        </h2>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
            <th>Team</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td style={{ fontSize: "12px" }}>{log.type}</td>
              <td style={{ fontSize: "12px", color: "var(--fg-muted)" }}>{log.description}</td>
              <td>
                {log.team ? (
                  <span style={{ color: log.team.color || "#8a2be2" }}>{log.team.name}</span>
                ) : (
                  <span style={{ color: "var(--fg-dim)" }}>—</span>
                )}
              </td>
              <td style={{ fontSize: "11px", color: "var(--fg-dim)" }}>
                {new Date(log.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
