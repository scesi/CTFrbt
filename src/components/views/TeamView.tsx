"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { fetchCached, invalidateCache } from "@/lib/terminal/cache";
import TeamIcon from "@/components/ui/TeamIcon";
import TeamIconSelector from "@/components/admin/TeamIconSelector";

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
  icon: string;
  color: string;
  score: number;
  members: TeamMember[];
}

const DEFAULT_ICON = "GiSpaceship";
const DEFAULT_COLOR = "#ffffff";
const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function TeamView() {
  const { data: session } = useSession();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draftIcon, setDraftIcon] = useState(DEFAULT_ICON);
  const [draftColor, setDraftColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);

  const loadTeam = useCallback(async () => {
    try {
      const data = (await fetchCached("/api/teams")) as {
        team: TeamData | null;
      };
      setTeam(data.team);
      if (data.team) {
        setDraftIcon(data.team.icon || DEFAULT_ICON);
        setDraftColor(data.team.color || DEFAULT_COLOR);
      }
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
      toast.success(
        `Team "${data.team.name}" created! Code: ${data.team.code}`,
      );
      invalidateCache("/api/teams");
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
      invalidateCache("/api/teams");
      loadTeam();
    } catch {
      toast.error("Failed to join team");
    } finally {
      setCreating(false);
    }
  };

  const saveCustomization = async () => {
    if (!team) return;
    if (!COLOR_REGEX.test(draftColor)) {
      toast.error("Color must be a hex code like #ff00aa");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon: draftIcon, color: draftColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update team");
        return;
      }
      toast.success("Team customized");
      setTeam((current) => (current ? { ...current, ...data.team } : current));
      invalidateCache("/api/teams");
      invalidateCache("/api/leaderboard");
      setCustomizing(false);
    } catch {
      toast.error("Failed to update team");
    } finally {
      setSaving(false);
    }
  };

  const isLeader = session?.user?.isTeamLeader;

  if (!session) {
    return (
      <div style={{ paddingTop: "32px" }}>
        <p style={{ color: "var(--fg-dim)" }}>Sign in to view your profile.</p>
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
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>
        Profile
      </h1>

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
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <TeamIcon
              name={team.icon || DEFAULT_ICON}
              color={team.color || DEFAULT_COLOR}
              size={26}
            />
            <div style={{ fontSize: "16px", fontWeight: 600 }}>
              {team.name}
            </div>
            {isLeader && (
              <button
                onClick={() => setCustomizing((c) => !c)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {customizing ? "cancel" : "customize"}
              </button>
            )}
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

          {isLeader && customizing && (
            <div
              className="card"
              style={{
                marginBottom: "16px",
                padding: "12px",
                borderColor: "var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--fg-dim)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "8px",
                }}
              >
                Customize team
              </div>
              <TeamIconSelector
                value={draftIcon}
                color={draftColor}
                onChange={setDraftIcon}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "10px",
                }}
              >
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    border: "1px solid var(--border)",
                    background: draftColor,
                    flexShrink: 0,
                  }}
                />
                <input
                  type="color"
                  value={draftColor}
                  onChange={(e) => setDraftColor(e.target.value)}
                  style={{ width: "60px", height: "28px", padding: 0 }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={draftColor}
                  onChange={(e) => setDraftColor(e.target.value)}
                  style={{
                    width: "120px",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                  }}
                />
                <button
                  onClick={saveCustomization}
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ marginLeft: "auto" }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

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
                <button type="submit" className="btn" disabled={creating}>
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
