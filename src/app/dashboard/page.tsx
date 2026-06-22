"use client";

import { useEffect, useState, useCallback } from "react";
import ChallengeView from "@/components/ChallengeView";
import toast from "react-hot-toast";

interface ChallengeFile {
  id: string;
  name: string;
  size: number;
}

interface FlagData {
  id: string;
  points: number;
  isSolved: boolean;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  category: string;
  difficulty: string;
  isLocked: boolean;
  isSolved: boolean;
  solveCount: number;
  multipleFlags: boolean;
  link: string | null;
  files: ChallengeFile[];
  hintCount: number;
  flags: FlagData[];
}

export default function Dashboard() {
  const [challengesByCategory, setChallengesByCategory] = useState<
    Record<string, Challenge[]>
  >({});
  const [selectedChallenge, setSelectedChallenge] =
    useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStatus, setGameStatus] = useState<{
    state: string;
    startsAt?: string;
  } | null>(null);

  const loadChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges");
      const data = await res.json();
      setChallengesByCategory(data.challengesByCategory || {});
      if (data.gameStatus) {
        setGameStatus(data.gameStatus);
      }
    } catch {
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

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
        Loading challenges...
      </div>
    );
  }

  // Game not started — show informational message
  if (gameStatus?.state === "not_started") {
    const startsAt = gameStatus.startsAt
      ? new Date(gameStatus.startsAt).toLocaleString()
      : null;

    return (
      <div style={{ paddingTop: "32px", textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
          CTF Not Started
        </h1>
        <p style={{ color: "var(--fg-dim)", fontSize: "14px" }}>
          {startsAt
            ? `The competition starts on ${startsAt}.`
            : "The competition hasn\u2019t started yet. Stay tuned."}
        </p>
      </div>
    );
  }

  const categories = Object.keys(challengesByCategory);

  if (categories.length === 0) {
    return (
      <div style={{ paddingTop: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--fg-dim)", fontSize: "14px" }}>
          No challenges available yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "8px" }}>
      {selectedChallenge ? (
        <div>
          <button
            onClick={() => setSelectedChallenge(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--fg-dim)",
              fontSize: "13px",
              cursor: "pointer",
              padding: "4px 0",
              marginBottom: "8px",
              fontFamily: "var(--font-mono)",
            }}
          >
            ← back to challenges
          </button>
          <ChallengeView challenge={selectedChallenge} />
        </div>
      ) : (
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              marginBottom: "24px",
            }}
          >
            Challenges
          </h1>

          {categories.map((category) => {
            const challenges = challengesByCategory[category];
            const solved = challenges.filter((c) => c.isSolved).length;

            return (
              <div key={category} style={{ marginBottom: "28px" }}>
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
                    {solved}/{challenges.length}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="card"
                      onClick={() =>
                        !challenge.isLocked && setSelectedChallenge(challenge)
                      }
                      style={{
                        cursor: challenge.isLocked
                          ? "not-allowed"
                          : "pointer",
                        opacity: challenge.isLocked ? 0.4 : 1,
                        borderColor: challenge.isSolved
                          ? "var(--success)"
                          : undefined,
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
                            color: challenge.isSolved
                              ? "var(--success)"
                              : "var(--fg)",
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
                        <span>{challenge.difficulty}</span>
                        <span>
                          {challenge.solveCount} solve
                          {challenge.solveCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
