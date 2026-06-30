"use client";

import { useEffect, useState, useCallback } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { fetchCached } from "@/lib/terminal/cache";

interface TeamRank {
  rank: number;
  id: string;
  name: string;
  score: number;
  memberCount: number;
  solveCount: number;
}

interface LeaderboardData {
  teams: TeamRank[];
  currentUserTeam: TeamRank | null;
}

export function ScoreboardView() {
  const [data, setData] = useState<LeaderboardData>({
    teams: [],
    currentUserTeam: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      // force=true on manual refresh to bypass cache TTL
      const json = await fetchCached("/api/leaderboard", isManualRefresh) as LeaderboardData;
      setData(json);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Single fetch on mount — no setInterval.
  // Re-running the 'scoreboard' command is the refresh mechanism,
  // just like running 'ls' again in a real terminal.
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

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
        Loading scoreboard...
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Scoreboard</h1>
        <button
          onClick={() => loadLeaderboard(true)}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--fg-dim)",
            fontSize: "12px",
            padding: "6px 10px",
            cursor: refreshing ? "default" : "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          <FiRefreshCw size={12} className={refreshing ? "spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Current team highlight */}
      {data.currentUserTeam && (
        <div
          style={{
            padding: "14px 18px",
            border: "1px solid var(--accent)",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ color: "var(--fg-dim)", fontSize: "12px" }}>
              YOUR TEAM
            </span>
            <div style={{ fontSize: "16px", fontWeight: 600, marginTop: "4px" }}>
              #{data.currentUserTeam.rank} {data.currentUserTeam.name}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>
              {data.currentUserTeam.score}
            </div>
            <span style={{ color: "var(--fg-dim)", fontSize: "11px" }}>
              points
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      {data.teams.length === 0 ? (
        <p style={{ color: "var(--fg-dim)", fontSize: "14px" }}>
          No teams registered yet.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "60px" }}>#</th>
              <th>Team</th>
              <th style={{ width: "100px", textAlign: "right" }}>Score</th>
              <th style={{ width: "80px", textAlign: "right" }}>Solves</th>
              <th style={{ width: "90px", textAlign: "right" }}>Members</th>
            </tr>
          </thead>
          <tbody>
            {data.teams.map((team) => (
              <tr
                key={team.id}
                style={
                  data.currentUserTeam?.id === team.id
                    ? { background: "rgba(74, 144, 226, 0.08)" }
                    : undefined
                }
              >
                <td
                  style={{
                    fontWeight: team.rank <= 3 ? 700 : 400,
                    color:
                      team.rank === 1
                        ? "#ffd700"
                        : team.rank === 2
                          ? "#c0c0c0"
                          : team.rank === 3
                            ? "#cd7f32"
                            : "var(--fg-muted)",
                  }}
                >
                  {team.rank}
                </td>
                <td style={{ fontWeight: 500 }}>{team.name}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>
                  {team.score}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    color: "var(--fg-muted)",
                  }}
                >
                  {team.solveCount}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    color: "var(--fg-dim)",
                  }}
                >
                  {team.memberCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
