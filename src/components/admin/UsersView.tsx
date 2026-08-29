"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "../ui/LoadingSpinner";
import { useSortableTable } from "@/hooks/useSortableTable";

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
    password: "",
  });
  const [createForm, setCreateForm] = useState({
    alias: "",
    name: "",
    password: "",
    isAdmin: false,
    isTeamLeader: false,
    teamId: "",
  });
  const [creating, setCreating] = useState(false);

  const sortAccessors = useMemo(
    () => ({
      alias: (u: User) => u.alias,
      name: (u: User) => u.name,
      isAdmin: (u: User) => u.isAdmin,
      isTeamLeader: (u: User) => u.isTeamLeader,
      team: (u: User) => u.team?.name ?? null,
      submissions: (u: User) => u._count.submissions,
      scores: (u: User) => u._count.scores,
    }),
    [],
  );

  const { sortedData, getSortIndicator, getThProps } = useSortableTable(
    users,
    { key: "alias", direction: "asc" },
    sortAccessors,
  );

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
    } catch {}
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
      password: "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      isAdmin: false,
      isTeamLeader: false,
      teamId: "",
      password: "",
    });
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/\s/.test(createForm.password)) {
      toast.error("Password must not contain spaces");
      return;
    }
    if (!createForm.alias.trim() || !createForm.name.trim()) {
      toast.error("Alias and name must not be blank");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          teamId: createForm.teamId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create user");
        return;
      }

      toast.success(`User "${data.user.alias}" created`);
      setCreateForm({
        alias: "",
        name: "",
        password: "",
        isAdmin: false,
        isTeamLeader: false,
        teamId: "",
      });
      loadUsers();
      onUserUpdated?.();
    } catch {
      toast.error("Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const payload = {
        name: editForm.name,
        isAdmin: editForm.isAdmin,
        isTeamLeader: editForm.isTeamLeader,
        teamId: editForm.teamId,
        ...(editForm.password ? { password: editForm.password } : {}),
      };

      const res = await fetch(`/api/admin/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      <div className="card" style={{ marginBottom: "24px" }}>
        <form
          onSubmit={createUser}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, auto)",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <div>
            <label className="form-label">Alias</label>
            <input
              type="text"
              className="form-input"
              value={createForm.alias}
              onChange={(e) =>
                setCreateForm({ ...createForm, alias: e.target.value })
              }
              placeholder="alias"
              maxLength={32}
              required
            />
          </div>
          <div>
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
              placeholder="Full name"
              maxLength={48}
              pattern=".*\S.*"
              title="Name must contain at least one non-space character"
              required
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={createForm.password}
              onChange={(e) =>
                setCreateForm({ ...createForm, password: e.target.value })
              }
              placeholder="Password"
              minLength={6}
              maxLength={128}
              pattern="\S+"
              title="Password must not contain spaces"
              required
            />
          </div>
          <div>
            <label className="form-label">Team</label>
            <select
              className="form-input"
              value={createForm.teamId}
              onChange={(e) =>
                setCreateForm({ ...createForm, teamId: e.target.value })
              }
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "14px", paddingBottom: "6px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                color: "var(--fg-muted)",
              }}
            >
              <input
                type="checkbox"
                checked={createForm.isAdmin}
                onChange={(e) =>
                  setCreateForm({ ...createForm, isAdmin: e.target.checked })
                }
                style={checkboxStyle}
              />
              Admin
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                color: "var(--fg-muted)",
              }}
            >
              <input
                type="checkbox"
                checked={createForm.isTeamLeader}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    isTeamLeader: e.target.checked,
                  })
                }
                style={checkboxStyle}
              />
              Leader
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th {...getThProps("alias")}>Alias{getSortIndicator("alias")}</th>
            <th {...getThProps("name")}>Name{getSortIndicator("name")}</th>
            <th {...getThProps("isAdmin")}>
              Admin{getSortIndicator("isAdmin")}
            </th>
            <th {...getThProps("isTeamLeader")}>
              Team Leader{getSortIndicator("isTeamLeader")}
            </th>
            <th {...getThProps("team")}>Team{getSortIndicator("team")}</th>
            <th {...getThProps("submissions", { textAlign: "right" })}>
              Submissions{getSortIndicator("submissions")}
            </th>
            <th {...getThProps("scores", { textAlign: "right" })}>
              Scores{getSortIndicator("scores")}
            </th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.alias}</td>
                <td>
                  {editingId === user.id ? (
                    <>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        style={{ width: "150px", fontSize: "13px" }}
                      />
                      <input
                        type="password"
                        className="form-input"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm({ ...editForm, password: e.target.value })
                        }
                        placeholder="New password"
                        maxLength={128}
                        style={{
                          width: "150px",
                          fontSize: "13px",
                          marginTop: "4px",
                        }}
                      />
                    </>
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
