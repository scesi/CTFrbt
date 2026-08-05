"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "../ui/LoadingSpinner";

interface User {
  id: string;
  alias: string;
  name: string;
  isAdmin: boolean;
  isTeamLeader: boolean;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
  team: {
    id: string;
    name: string;
  } | null;
  _count: {
    submissions: number;
    scores: number;
  };
}

interface Team {
  id: string;
  name: string;
}

interface UsersViewProps {
  currentUserId?: string;
  onUserUpdated?: () => void;
}

export default function UsersView({
  currentUserId,
  onUserUpdated,
}: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    isAdmin: false,
    isTeamLeader: false,
    teamId: "",
  });

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch {
      // Teams are optional, don't show error
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      isAdmin: user.isAdmin,
      isTeamLeader: user.isTeamLeader,
      teamId: user.teamId || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      isAdmin: false,
      isTeamLeader: false,
      teamId: "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const res = await fetch(`/api/admin/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update user");
        return;
      }

      toast.success(`User "${data.user.alias}" updated`);
      setUsers((currentUsers) =>
        currentUsers.map((u) =>
          u.id === editingId ? { ...u, ...data.user } : u,
        ),
      );
      cancelEdit();
      onUserUpdated?.();
    } catch {
      toast.error("Failed to update user");
    }
  };

  const deleteUser = async (id: string, alias: string) => {
    if (id === currentUserId) {
      toast.error("Cannot delete your own account");
      return;
    }
    if (!confirm(`Delete user "${alias}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success(`User "${alias}" deleted`);
      setUsers(users.filter((u) => u.id !== id));
      onUserUpdated?.();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const checkboxStyle = {
    width: "18px",
    height: "18px",
    cursor: "pointer",
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
          Users ({users.length})
        </h2>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Alias</th>
            <th>Name</th>
            <th>Admin</th>
            <th>Team Leader</th>
            <th>Team</th>
            <th style={{ textAlign: "right" }}>Submissions</th>
            <th style={{ textAlign: "right" }}>Scores</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.alias}</td>
                <td>
                  {editingId === user.id ? (
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      style={{ width: "150px", fontSize: "13px" }}
                    />
                  ) : (
                    user.name
                  )}
                </td>
                <td>
                  {editingId === user.id ? (
                    <input
                      type="checkbox"
                      checked={editForm.isAdmin}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isAdmin: e.target.checked })
                      }
                      style={checkboxStyle}
                    />
                  ) : (
                    <span
                      style={{
                        color: user.isAdmin
                          ? "var(--success)"
                          : "var(--fg-dim)",
                      }}
                    >
                      {user.isAdmin ? "Yes" : "No"}
                    </span>
                  )}
                </td>
                <td>
                  {editingId === user.id ? (
                    <input
                      type="checkbox"
                      checked={editForm.isTeamLeader}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          isTeamLeader: e.target.checked,
                        })
                      }
                      style={checkboxStyle}
                    />
                  ) : (
                    <span
                      style={{
                        color: user.isTeamLeader
                          ? "var(--success)"
                          : "var(--fg-dim)",
                      }}
                    >
                      {user.isTeamLeader ? "Yes" : "No"}
                    </span>
                  )}
                </td>
                <td>
                  {editingId === user.id ? (
                    <select
                      className="form-input"
                      value={editForm.teamId}
                      onChange={(e) =>
                        setEditForm({ ...editForm, teamId: e.target.value })
                      }
                      style={{ width: "150px", fontSize: "13px" }}
                    >
                      <option value="">No team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  ) : user.team ? (
                    <span style={{ color: "var(--accent)" }}>
                      {user.team.name}
                    </span>
                  ) : (
                    <span style={{ color: "var(--fg-dim)" }}>—</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  {user._count.submissions}
                </td>
                <td style={{ textAlign: "right" }}>{user._count.scores}</td>
                <td style={{ textAlign: "right" }}>
                  {editingId === user.id ? (
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
                        onClick={() => startEdit(user)}
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
                        onClick={() => deleteUser(user.id, user.alias)}
                        disabled={isSelf}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: isSelf ? "var(--fg-dim)" : "var(--danger)",
                          cursor: isSelf ? "not-allowed" : "pointer",
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                          opacity: isSelf ? 0.5 : 1,
                        }}
                      >
                        delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
