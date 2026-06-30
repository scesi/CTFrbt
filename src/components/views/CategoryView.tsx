"use client";

import { useEffect, useState, useCallback } from "react";
import { useTerminal } from "@/lib/terminal/TerminalContext";
import toast from "react-hot-toast";
import { ChallengeData } from "@/components/ChallengeView";
import { fetchCached } from "@/lib/terminal/cache";

export function CategoryView({ category }: { category: string }) {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const { executeCommand } = useTerminal();

  const loadChallenges = useCallback(async () => {
    try {
      const data = await fetchCached("/api/challenges") as {
        challengesByCategory?: Record<string, ChallengeData[]>;
      };
      const byCategory = data.challengesByCategory || {};
      setChallenges(byCategory[category] || []);
    } catch {
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  if (loading) {
    return (
      <div style={{ color: "var(--fg-dim)", fontSize: "14px", padding: "10px 0" }}>
        Loading {category} challenges...
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div style={{ color: "var(--fg-dim)", fontSize: "14px", padding: "10px 0" }}>
        No challenges available in {category}.
      </div>
    );
  }

  const solvedCount = challenges.filter((c) => c.isSolved).length;

  return (
    <div style={{ marginBottom: "20px", marginTop: "10px", maxWidth: "800px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {category}
        </h2>
        <span
          style={{
            fontSize: "11px",
            color: "var(--fg-dim)",
          }}
        >
          {solvedCount}/{challenges.length} solved
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "10px",
        }}
      >
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className={`card ${challenge.isSolved ? "solved" : ""} ${challenge.isLocked ? "locked" : ""}`}
            onClick={() => {
              if (!challenge.isLocked) {
                executeCommand(`cat ~/challenges/${category}/${challenge.id}.txt`);
              }
            }}
            style={{
              cursor: challenge.isLocked ? "not-allowed" : "pointer",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: challenge.isSolved ? "var(--success)" : "var(--fg)",
                }}
              >
                {challenge.isLocked ? "🔒 " : ""}
                {challenge.title}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--fg-dim)",
                }}
              >
                {challenge.points}pts
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                fontSize: "11px",
                color: "var(--fg-dim)",
              }}
            >
              <span style={{ color: "var(--neon-amber)" }}>{challenge.difficulty}</span>
              <span>
                {challenge.solveCount} solve{challenge.solveCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
