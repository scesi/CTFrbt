"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface Team {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
  };
}

interface TeamsViewProps {
  onTeamUpdated?: () => void;
}

export default function TeamsView({ onTeamUpdated }: TeamsViewProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
  });

  const loadTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teams");
      const data = await res.json();
      setTeams(data.teams || []);
    } catch {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditForm({
      name: team.name,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const res = await fetch(`/api/admin/teams/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update team");
        return;
      }

      toast.success(`Team "${data.team.name}" updated`);
      setTeams(teams.map(t =>
        t.id === editingId ? { ...t, ...data.team } : t
      ));
      cancelEdit();
      onTeamUpdated?.();
    } catch {
      toast.error("Failed to update team");
    }
  };

  const deleteTeam = async (id: string, name: string) => {
    if (!confirm(`Delete team "${name}"? Members will be removed from the team. This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete team");
        return;
      }

      toast.success(`Team "${name}" deleted`);
      setTeams(teams.filter(t => t.id !== id));
      onTeamUpdated?.();
    } catch {
      toast.error("Failed to delete team");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "16px", color: "var(--fg-dim)" }}>
        Loading teams...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
          Teams ({teams.length})
        </h2>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th style={{ textAlign: "right" }}>Score</th>
            <th style={{ textAlign: "right" }}>Members</th>
            <th>Created</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id}>
              <td style={{ fontWeight: 500 }}>
                {editingId === team.id ? (
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{ width: "150px", fontSize: "13px" }}
                  />
                ) : (
                  <span style={{ color: team.color }}>{team.name}</span>
                )}
              </td>
              <td>
                <code style={{ fontSize: "12px", color: "var(--fg-dim)" }}>{team.code}</code>
              </td>
              <td style={{ textAlign: "right" }}>{team.score}</td>
              <td style={{ textAlign: "right" }}>{team._count.members}</td>
              <td style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
                {new Date(team.createdAt).toLocaleDateString()}
              </td>
              <td style={{ textAlign: "right" }}>
                {editingId === team.id ? (
                  <>
                    <button
                      onClick={saveEdit}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--success)",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono)",
                        marginRight: "8px",
                      }}
                    >
                      save
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--fg-muted)",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(team)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--fg-muted)",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono)",
                        marginRight: "8px",
                      }}
                    >
                      edit
                    </button>
                    <button
                      onClick={() => deleteTeam(team.id, team.name)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
