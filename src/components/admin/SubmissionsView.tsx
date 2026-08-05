"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "../ui/LoadingSpinner";

interface Submission {
  id: string;
  flag: string;
  isCorrect: boolean;
  createdAt: string;
  user: {
    id: string;
    alias: string;
    name: string;
  };
  team: {
    id: string;
    name: string;
    color: string;
  };
  challenge: {
    id: string;
    title: string;
  };
}

export default function SubmissionsView() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/submissions");
      if (!res.ok) {
        toast.error("Failed to load submissions");
        return;
      }
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

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
          Submissions ({submissions.length})
        </h2>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Team</th>
            <th>User</th>
            <th>Challenge</th>
            <th>Flag</th>
            <th>Correct</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => (
            <tr key={sub.id}>
              <td style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
                {new Date(sub.createdAt).toLocaleString()}
              </td>
              <td style={{ color: sub.team?.color || "var(--accent)" }}>
                {sub.team?.name || "—"}
              </td>
              <td style={{ fontSize: "12px" }}>{sub.user.alias}</td>
              <td style={{ fontSize: "12px" }}>{sub.challenge.title}</td>
              <td
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--fg-muted)",
                }}
              >
                {sub.flag}
              </td>
              <td>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: sub.isCorrect ? "var(--success)" : "var(--danger)",
                    padding: "2px 6px",
                    border: `1px solid ${sub.isCorrect ? "var(--success)" : "var(--danger)"}`,
                  }}
                >
                  {sub.isCorrect ? "Yes" : "No"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
