import React from "react";
import { TerminalState, TerminalAction, OutputBlock } from "./types";
import ChallengeView, { ChallengeData } from "@/components/ChallengeView";
import { Session } from "next-auth";
import { ScoreboardView } from "@/components/views/ScoreboardView";
import { RulesView } from "@/components/views/RulesView";
import { TeamView } from "@/components/views/TeamView";
import { CategoryView } from "@/components/views/CategoryView";

const CACHE_TTL_MS = 10_000; // same order of magnitude as server cache

interface CacheEntry {
  data: unknown;
  expiry: number;
}

const apiCache: Record<string, CacheEntry> = {};

async function fetchCached(url: string, force = false): Promise<unknown> {
  const now = Date.now();
  const cached = apiCache[url];

  if (!force && cached && cached.expiry > now) {
    return cached.data;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("API request failed");
  const data = await res.json();
  apiCache[url] = { data, expiry: now + CACHE_TTL_MS };
  return data;
}

function invalidateCache(url: string) {
  delete apiCache[url];
}

function resolvePath(cwd: string, target: string): string {
  if (!target) return cwd;
  if (target === "~" || target === "/") return "~";
  
  const basePath = target.startsWith("~/") ? "~" : cwd;
  const parts = basePath.split("/").filter(Boolean);
  const targetParts = target.replace(/^~\/?/, "").split("/").filter(Boolean);

  for (const part of targetParts) {
    if (part === ".") continue;
    if (part === "..") {
      if (parts.length > 1) parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/") || "~";
}

export type CommandContext = {
  state: TerminalState;
  dispatch: React.Dispatch<TerminalAction>;
  appendOutput: (content: React.ReactNode | string, type?: OutputBlock["type"]) => void;
  clearHistory: () => void;
  session: Session | null;
};

export type CommandHandler = (args: string[], ctx: CommandContext) => Promise<void> | void;

export async function getAutocompleteCandidates(input: string, cwd: string): Promise<string[]> {
  const parts = input.split(" ");
  const lastPart = parts[parts.length - 1] || "";
  
  if (parts.length === 1) {
    // Autocomplete command
    return Object.keys(COMMAND_REGISTRY).filter(cmd => cmd.startsWith(lastPart));
  }

  const cmd = parts[0];
  if (!["cd", "cat", "ls", "submit", "hint"].includes(cmd)) {
    return [];
  }

  let options: string[] = [];

  // Naive filesystem mapping using local memory cache (0 server cost)
  if (cwd === "~") {
    options = ["challenges", "teams", "rules.txt", "announcements.txt"];
  } else if (cwd === "~/challenges") {
    const data = apiCache["/api/challenges"] as { categories?: string[] } | undefined;
    if (data?.categories) {
      options = data.categories;
    }
  } else if (cwd.startsWith("~/challenges/")) {
    const category = cwd.split("/")[2];
    const data = apiCache["/api/challenges"] as { challengesByCategory?: Record<string, { id: string }[]> } | undefined;
    if (data?.challengesByCategory?.[category]) {
      // For cat/ls we might want .txt, for submit/hint we just want the ID
      if (cmd === "submit" || cmd === "hint") {
        options = data.challengesByCategory[category].map(c => c.id);
      } else {
        options = data.challengesByCategory[category].map(c => c.id + ".txt");
      }
    }
  } else if (cwd === "~/teams") {
    const data = apiCache["/api/leaderboard"] as { teams?: { name: string }[] } | undefined;
    if (data?.teams) {
      options = data.teams.map(t => t.name.replace(/\s+/g, '_') + ".txt");
    }
  }

  return options.filter(opt => opt.startsWith(lastPart));
}

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
  help: (args, { appendOutput }) => {
    appendOutput(
      <div>
        <strong>Available Commands:</strong>
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0" }}>
          <li><span style={{ color: "var(--neon-green)" }}>help</span> - Show this message</li>
          <li><span style={{ color: "var(--neon-green)" }}>clear</span> - Clear terminal screen</li>
          <li><span style={{ color: "var(--neon-green)" }}>challenges</span> - View available CTF challenges</li>
          <li><span style={{ color: "var(--neon-green)" }}>logout</span> - End current session</li>
          <li><span style={{ color: "var(--neon-green)" }}>whoami</span> - Display current user info</li>
          <li><span style={{ color: "var(--neon-green)" }}>pwd</span> - Print working directory</li>
          <li><span style={{ color: "var(--neon-green)" }}>ls</span> - List files and directories</li>
          <li><span style={{ color: "var(--neon-green)" }}>cd &lt;dir&gt;</span> - Change directory</li>
          <li><span style={{ color: "var(--neon-green)" }}>cat &lt;file&gt;</span> - View file contents</li>
          <li><span style={{ color: "var(--neon-green)" }}>scoreboard</span> - View live leaderboard</li>
        </ul>
      </div>
    );
  },

  clear: (args, { clearHistory }) => {
    clearHistory();
  },

  whoami: (args, { session, appendOutput }) => {
    if (!session?.user) {
      appendOutput("guest (unauthenticated)");
      return;
    }
    appendOutput(
      <div>
        User: <strong>{session.user.alias}</strong>
        <br />
        Team ID: {session.user.teamId || "None"}
      </div>
    );
  },

  pwd: (args, { state, appendOutput }) => {
    appendOutput(state.cwd);
  },

  ls: async (args, { state, appendOutput }) => {
    const targetPath = resolvePath(state.cwd, args[0] || "");

    if (targetPath === "~") {
      appendOutput(
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <span style={{ color: "var(--neon-blue)" }}>challenges/</span>
          <span style={{ color: "var(--neon-blue)" }}>teams/</span>
          <span>rules.txt</span>
          <span>announcements.txt</span>
        </div>
      );
      return;
    }
    
    if (targetPath === "~/challenges") {
      try {
        const data = await fetchCached("/api/challenges") as { categories: string[] };
        appendOutput(
          <div style={{ display: "flex", gap: "15px" }}>
            {data.categories.map(c => (
              <span key={c} style={{ color: "var(--neon-blue)" }}>{c}/</span>
            ))}
          </div>
        );
      } catch {
        appendOutput("Error listing challenges", "error");
      }
      return;
    }

    if (targetPath.startsWith("~/challenges/")) {
      const category = targetPath.split("/")[2];
      try {
        const data = await fetchCached("/api/challenges") as { challengesByCategory: Record<string, { id: string, difficulty: string, points: number }[]> };
        const categoryChallenges = data.challengesByCategory[category] || [];
        if (categoryChallenges.length === 0) {
          appendOutput("No files found.");
          return;
        }
        appendOutput(
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {categoryChallenges.map(c => (
              <span key={c.id}>{c.id}.txt ({c.difficulty}, {c.points} pts)</span>
            ))}
          </div>
        );
      } catch {
        appendOutput("Error listing challenges", "error");
      }
      return;
    }

    if (targetPath === "~/teams") {
      try {
        const data = await fetchCached("/api/leaderboard") as { teams: { id: string, name: string, score: number }[] };
        const teams = data.teams;
        if (!teams || teams.length === 0) {
          appendOutput("No files found.");
          return;
        }
        appendOutput(
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", color: "var(--neon-cyan)" }}>
            {teams.map(t => (
              <span key={t.id}>{t.name.replace(/\s+/g, '_')}.txt</span>
            ))}
          </div>
        );
      } catch {
        appendOutput("Error listing teams", "error");
      }
      return;
    }

    appendOutput(`ls: ${args[0] || targetPath}: No such file or directory`, "error");
  },

  cd: (args, { state, dispatch, appendOutput }) => {
    const target = args[0] || "~";
    const newPath = resolvePath(state.cwd, target);

    // Naive directory validation
    if (newPath === "~" || newPath === "~/challenges" || newPath === "~/teams" || newPath.startsWith("~/challenges/")) {
      dispatch({ type: "SET_CWD", payload: newPath });
      return;
    }

    appendOutput(`cd: no such file or directory: ${target}`, "error");
  },

  cat: async (args, { state, appendOutput }) => {
    const target = args[0];
    if (!target) {
      appendOutput("cat: missing file operand", "error");
      return;
    }

    const targetPath = resolvePath(state.cwd, target);

    // If it's a directory
    if (targetPath === "~" || targetPath === "~/challenges" || targetPath === "~/teams") {
      appendOutput(`cat: ${target}: Is a directory`, "error");
      return;
    }

    if (targetPath.startsWith("~/challenges/") && !targetPath.endsWith(".txt") && targetPath.split("/").length === 3) {
      const category = targetPath.split("/")[2];
      appendOutput(<CategoryView category={category} />);
      return;
    }

    if (targetPath === "~/rules.txt") {
      try {
        const rules = await fetchCached("/api/rules") as { value: string };
        appendOutput(<div style={{ whiteSpace: "pre-wrap" }}>{rules.value}</div>);
      } catch {
        appendOutput("Error reading rules.txt", "error");
      }
      return;
    }

    if (targetPath === "~/announcements.txt") {
      appendOutput("No new announcements.");
      return;
    }

    if (targetPath.startsWith("~/challenges/") && targetPath.endsWith(".txt")) {
      const parts = targetPath.split("/");
      const filename = parts[parts.length - 1];
      const challengeId = filename.replace(".txt", "");
      try {
        const data = await fetchCached("/api/challenges") as {
          challengesByCategory: Record<string, ChallengeData[]>;
        };
        const allChallenges = Object.values(data.challengesByCategory).flat();
        const challenge = allChallenges.find((c) => c.id === challengeId);

        if (!challenge) {
          appendOutput(`cat: ${target}: No such file or directory`, "error");
          return;
        }

        appendOutput(
          <div style={{ border: "1px dashed var(--neon-blue)", padding: "16px", margin: "10px 0" }}>
            <ChallengeView
              challenge={challenge}
              onSolved={() => {
                invalidateCache("/api/challenges");
                invalidateCache("/api/leaderboard");
              }}
            />
          </div>
        );
      } catch {
        appendOutput("Error reading challenge", "error");
      }
      return;
    }

    if (targetPath.startsWith("~/teams/") && targetPath.endsWith(".txt")) {
      const filename = targetPath.split("/").pop() || "";
      const teamName = filename.replace(".txt", "");
      try {
        const data = await fetchCached("/api/leaderboard") as { teams: { id: string, name: string, score: number }[] };
        const teams = data.teams;
        const team = teams.find(t => t.name.replace(/\s+/g, '_') === teamName);
        if (!team) {
          appendOutput(`cat: ${target}: No such file or directory`, "error");
          return;
        }
        appendOutput(
          <div style={{ border: "1px dashed var(--neon-cyan)", padding: "10px", margin: "10px 0" }}>
            <h3 style={{ color: "var(--neon-green)", margin: "0 0 10px 0" }}>Team: {team.name}</h3>
            <div style={{ color: "var(--neon-amber)" }}>Score: {team.score}</div>
          </div>
        );
      } catch {
        appendOutput("Error reading team info", "error");
      }
      return;
    }

    appendOutput(`cat: ${target}: No such file or directory`, "error");
  },

  logout: async (args, { appendOutput }) => {
    const { signOut } = await import("next-auth/react");
    appendOutput("Logging out...");
    await signOut({ redirect: false });
    appendOutput("Session terminated. Redirecting to home...", "system");
    window.location.href = "/";
  },

  scoreboard: (args, { appendOutput }) => {
    appendOutput(<ScoreboardView />);
  },

  rules: (args, { appendOutput }) => {
    appendOutput(<RulesView />);
  },

  team: (args, { appendOutput }) => {
    appendOutput(<TeamView />);
  },

  challenges: async (args, { appendOutput }) => {
    try {
      const data = await fetchCached("/api/challenges") as {
        categories: string[];
        challengesByCategory: Record<string, { id: string, title: string, difficulty: string, points: number, isSolved: boolean }[]>;
      };
      
      if (!data.categories || data.categories.length === 0) {
        appendOutput("No challenges available yet.");
        return;
      }

      appendOutput(
        <div style={{ margin: "10px 0" }}>
          <h2 style={{ color: "var(--neon-cyan)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "2px" }}>
            CTF Challenges
          </h2>
          {data.categories.map((category) => (
            <div key={category} style={{ marginBottom: "20px" }}>
              <h3 style={{ color: "var(--neon-green)", borderBottom: "1px solid var(--neon-green)", paddingBottom: "4px", marginBottom: "8px" }}>
                /challenges/{category}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "10px" }}>
                {data.challengesByCategory[category].map((c) => (
                  <div key={c.id} style={{ 
                    border: `1px solid ${c.isSolved ? "var(--neon-green)" : "var(--gray-600)"}`, 
                    padding: "10px", 
                    display: "flex", 
                    flexDirection: "column",
                    background: "rgba(0,0,0,0.3)"
                  }}>
                    <strong style={{ color: c.isSolved ? "var(--neon-green)" : "var(--gray-300)" }}>
                      {c.title} {c.isSolved && "✓"}
                    </strong>
                    <div style={{ fontSize: "12px", color: "var(--neon-amber)", marginTop: "4px" }}>
                      {c.difficulty} | {c.points} pts
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--gray-400)", marginTop: "8px" }}>
                      Run: `cat challenges/{category}/{c.id}.txt`
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    } catch {
      appendOutput("Error loading challenges", "error");
    }
  },

  submit: async (args, ctx) => {
    if (!ctx.session?.user) {
      ctx.appendOutput("You must be logged in to submit flags.", "error");
      return;
    }

    const flag = args[args.length - 1]; // Flag is last arg
    // Optional challenge id if not in challenge dir
    const challengeId = args.length > 1 ? args[0] : null;

    if (!flag) {
      ctx.appendOutput("Usage: submit [challenge_id] <flag>", "error");
      return;
    }

    if (!challengeId) {
      if (ctx.state.cwd.startsWith("~/challenges/")) {
        // Find if they typed "submit web-01 flag{...}"
        // But if they just typed "submit flag{...}", we don't know the exact challenge
        // So we assume they must pass challenge ID
        ctx.appendOutput("Usage: submit <challenge_id> <flag>", "error");
        return;
      } else {
        ctx.appendOutput("Usage: submit <challenge_id> <flag>", "error");
        return;
      }
    }

    ctx.dispatch({ type: "SET_PROCESSING", payload: true });
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, flag }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      
      if (data.correct) {
        ctx.appendOutput(
          <div style={{ color: "var(--neon-green)" }}>
            [SUCCESS] Correct flag! You gained {data.points} points.
          </div>
        );
        invalidateCache("/api/challenges");
        invalidateCache("/api/leaderboard");
      } else {
        ctx.appendOutput(<div style={{ color: "var(--neon-amber)" }}>[FAILED] Incorrect flag.</div>);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      ctx.appendOutput(`Error: ${msg}`, "error");
    } finally {
      ctx.dispatch({ type: "SET_PROCESSING", payload: false });
    }
  },

  hint: async (args, ctx) => {
    const challengeId = args[0];
    if (!challengeId) {
      ctx.appendOutput("Usage: hint <challenge_id> — or use 'cat challenges/<category>/<id>.txt' for the full interactive view.", "error");
      return;
    }
    ctx.appendOutput(
      `Tip: run 'cat challenges/<category>/${challengeId}.txt' to view and purchase hints interactively.`,
    );
  }
};
