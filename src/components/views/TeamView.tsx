"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface TeamMember {
  id: string;
  name: string;
  alias: string;
  isTeamLeader: boolean;
}

interface TeamData {
  id: string;
  name: string;
  code: string;
  score: number;
  members: TeamMember[];
}

export function TeamView() {
  const { data: session } = useSession();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [creating, setCreating] = useState(false);

  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeam(data.team);
    } catch (error) {
      console.error("Failed to load team:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) loadTeam();
    else setLoading(false);
  }, [session, loadTeam]);

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", teamName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Team "${data.team.name}" created! Code: ${data.team.code}`);
      loadTeam();
    } catch {
      toast.error("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const joinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", teamCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Joined "${data.team.name}"`);
      loadTeam();
    } catch {
      toast.error("Failed to join team");
    } finally {
      setCreating(false);
    }
  };

  if (!session) {
    return (
      <div style={{ paddingTop: "32px" }}>
        <p style={{ color: "var(--fg-dim)" }}>
          Sign in to view your profile.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "200px",
          color: "var(--fg-dim)",
          fontSize: "14px",
        }}
      >
        Loading profile...
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "8px", maxWidth: "520px" }}>
      <h1
        style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}
      >
        Profile
      </h1>

      {/* User info */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div
          style={{
            fontSize: "12px",
            color: "var(--fg-dim)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px",
          }}
        >
          User
        </div>
        <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
          {session.user.name}
        </div>
        <div style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
          @{session.user.alias}
        </div>
      </div>

      {/* Team section */}
      {team ? (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "var(--fg-dim)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
            }}
          >
            Team
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            {team.name}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--fg-muted)",
              marginBottom: "12px",
            }}
          >
            Score: {team.score} pts | Invite code:{" "}
            <code
              style={{
                background: "rgba(255,255,255,0.05)",
                padding: "2px 6px",
                fontSize: "12px",
              }}
            >
              {team.code}
            </code>
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "var(--fg-dim)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            Members ({team.members.length})
          </div>
          {team.members.map((m) => (
            <div
              key={m.id}
              style={{
                fontSize: "13px",
                color: "var(--fg-muted)",
                padding: "4px 0",
              }}
            >
              {m.name} (@{m.alias})
              {m.isTeamLeader && (
                <span style={{ color: "var(--warning)", marginLeft: "6px" }}>
                  ★
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "var(--fg-dim)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "16px",
            }}
          >
            You are not in a team
          </div>

          {/* Create team */}
          <div className="card" style={{ marginBottom: "12px" }}>
            <form onSubmit={createTeam}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--fg-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Create Team
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="form-input"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team name"
                  maxLength={32}
                  required
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  Create
                </button>
              </div>
            </form>
          </div>

          {/* Join team */}
          <div className="card">
            <form onSubmit={joinTeam}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "var(--fg-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Join Team
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="form-input"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  placeholder="Invite code"
                  required
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn"
                  disabled={creating}
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
