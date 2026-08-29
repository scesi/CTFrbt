"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "../ui/LoadingSpinner";
import { useSortableTable } from "@/hooks/useSortableTable";

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

  const sortAccessors = useMemo(
    () => ({
      type: (l: ActivityLog) => l.type,
      description: (l: ActivityLog) => l.description,
      team: (l: ActivityLog) => l.team?.name ?? null,
      time: (l: ActivityLog) => new Date(l.createdAt).getTime(),
    }),
    [],
  );

  const { sortedData, getSortIndicator, getThProps } = useSortableTable(
    logs,
    { key: "time", direction: "desc" },
    sortAccessors,
  );

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
  }, [loadLogs]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
          Activity Logs ({logs.length})
        </h2>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th {...getThProps("type")}>Type{getSortIndicator("type")}</th>
            <th {...getThProps("description")}>
              Description{getSortIndicator("description")}
            </th>
            <th {...getThProps("team")}>Team{getSortIndicator("team")}</th>
            <th {...getThProps("time")}>Time{getSortIndicator("time")}</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((log) => (
            <tr key={log.id}>
              <td style={{ fontSize: "12px" }}>{log.type}</td>
              <td style={{ fontSize: "12px", color: "var(--fg-muted)" }}>
                {log.description}
              </td>
              <td>
                {log.team ? (
                  <span style={{ color: log.team.color || "#8a2be2" }}>
                    {log.team.name}
                  </span>
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
