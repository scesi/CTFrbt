"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "./loading/LoadingSpinner";
import TeamEditModal from "./TeamEditModal";
import TeamIcon from "../ui/TeamIcon";

export interface Team {
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
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

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

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
  };

  const handleCloseModal = () => {
    setEditingTeam(null);
  };

  const handleSaveTeam = async (updatedData: {
    name: string;
    icon: string;
    color: string;
    code: string;
  }) => {
    if (!editingTeam) return;

    const res = await fetch(`/api/admin/teams/${editingTeam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to update team");
    }

    toast.success(`Team "${data.team.name}" updated`);
    setTeams((currentTeams) =>
      currentTeams.map((t) =>
        t.id === editingTeam.id ? { ...t, ...data.team } : t,
      ),
    );
    onTeamUpdated?.();
  };

  const deleteTeam = async (id: string, name: string) => {
    if (
      !confirm(
        `Delete team "${name}"? Members will be removed from the team. This cannot be undone.`,
      )
    )
      return;

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
      setTeams((currentTeams) => currentTeams.filter((t) => t.id !== id));
      onTeamUpdated?.();
    } catch {
      toast.error("Failed to delete team");
    }
  };

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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <TeamIcon name={team.icon} color={team.color} size={18} />
                  <span style={{ color: team.color }}>{team.name}</span>
                </div>
              </td>
              <td>
                <code style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
                  {team.code}
                </code>
              </td>
              <td style={{ textAlign: "right" }}>{team.score}</td>
              <td style={{ textAlign: "right" }}>{team._count.members}</td>
              <td style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
                {new Date(team.createdAt).toLocaleDateString()}
              </td>
              <td style={{ textAlign: "right" }}>
                <button
                  onClick={() => handleEditTeam(team)}
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <TeamEditModal
        team={editingTeam}
        isOpen={!!editingTeam}
        onClose={handleCloseModal}
        onSave={handleSaveTeam}
      />
    </div>
  );
}
