import React from "react";
import { TerminalState, TerminalAction, OutputBlock } from "./types";
import { Session } from "next-auth";

const apiCache: Record<string, unknown> = {};

async function fetchCached(url: string) {
  if (apiCache[url]) return apiCache[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error("API request failed");
  const data = await res.json();
  apiCache[url] = data;
  return data;
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

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
  help: (args, { appendOutput }) => {
    appendOutput(
      <div>
        <strong>Available Commands:</strong>
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0" }}>
          <li><span style={{ color: "var(--neon-green)" }}>help</span> - Show this message</li>
          <li><span style={{ color: "var(--neon-green)" }}>clear</span> - Clear terminal screen</li>
          <li><span style={{ color: "var(--neon-green)" }}>login</span> - Authenticate as user</li>
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

  scoreboard: async (args, { appendOutput }) => {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch scoreboard");
      const teams = await res.json();
      
      if (!teams || teams.length === 0) {
        appendOutput("Scoreboard is empty. No teams registered yet.");
        return;
      }

      appendOutput(
        <div style={{ margin: "10px 0" }}>
          <div style={{ color: "var(--neon-cyan)", marginBottom: "5px" }}>
            RANK | TEAM                | SCORE
            <br />
            ----------------------------------
          </div>
          {(teams as { id: string, name: string, score: number }[]).map((t, i) => (
            <div key={t.id}>
              {String(i + 1).padStart(4)} | {t.name.padEnd(20)} | {t.score}
            </div>
          ))}
        </div>
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      appendOutput(`Error fetching scoreboard: ${msg}`, "error");
    }
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
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("API error");
        const teams = await res.json() as { id: string, name: string, score: number }[];
        if (teams.length === 0) {
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
    if (targetPath === "~" || targetPath === "~/challenges" || targetPath === "~/teams" || 
       (targetPath.startsWith("~/challenges/") && !targetPath.endsWith(".txt") && targetPath.split("/").length === 3)) {
      appendOutput(`cat: ${target}: Is a directory`, "error");
      return;
    }

    if (targetPath === "~/rules.txt") {
      try {
        const rules = await fetchCached("/api/rules");
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
        const data = await fetchCached("/api/challenges") as { challengesByCategory: Record<string, { id: string, title: string, description: string, category: string, difficulty: string, points: number, link?: string }[]> };
        const allChallenges = Object.values(data.challengesByCategory).flat();
        const challenge = allChallenges.find(c => c.id === challengeId);
        
        if (!challenge) {
          appendOutput(`cat: ${target}: No such file or directory`, "error");
          return;
        }

        appendOutput(
          <div style={{ border: "1px dashed var(--neon-blue)", padding: "10px", margin: "10px 0" }}>
            <h3 style={{ color: "var(--neon-green)", margin: "0 0 10px 0" }}>{challenge.title}</h3>
            <p style={{ whiteSpace: "pre-wrap", marginBottom: "10px" }}>{challenge.description}</p>
            <div style={{ color: "var(--neon-amber)" }}>
              Category: {challenge.category} | Difficulty: {challenge.difficulty} | Points: {challenge.points}
            </div>
            {challenge.link && (
              <div style={{ marginTop: "10px" }}>
                Target: <a href={challenge.link} target="_blank" rel="noreferrer" style={{ color: "var(--neon-cyan)" }}>{challenge.link}</a>
              </div>
            )}
            <div style={{ marginTop: "10px", color: "var(--gray-400)" }}>
              To submit: `submit {challenge.id} flag&#123;...&#125;`
            </div>
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
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("API error");
        const teams = await res.json() as { id: string, name: string, score: number }[];
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
    appendOutput("Session terminated. You are now guest.", "system");
  },

  login: async (args, ctx) => {
    const { setTerminalPrompt } = await import("./parser");
    const { signIn } = await import("next-auth/react");

    if (ctx.session?.user) {
      ctx.appendOutput("Already logged in. Use 'logout' first.", "error");
      return;
    }

    setTerminalPrompt(ctx, "Username: ", "prompt", (username) => {
      if (!username) {
        ctx.appendOutput("Login cancelled.", "error");
        return;
      }
      setTerminalPrompt(ctx, "Password: ", "password", async (password) => {
        ctx.dispatch({ type: "SET_PROCESSING", payload: true });
        try {
          const res = await signIn("credentials", {
            alias: username,
            password,
            redirect: false,
          });
          if (res?.error) {
            ctx.appendOutput(`Login failed: ${res.error}`, "error");
          } else {
            ctx.appendOutput(`Welcome back, ${username}. Access granted.`, "system");
            // Force a reload to get session via next-auth
            window.location.reload();
          }
        } finally {
          ctx.dispatch({ type: "SET_PROCESSING", payload: false });
        }
      });
    });
  },

  register: async (args, ctx) => {
    const { setTerminalPrompt } = await import("./parser");

    if (ctx.session?.user) {
      ctx.appendOutput("Already logged in. Use 'logout' first.", "error");
      return;
    }

    setTerminalPrompt(ctx, "New Username: ", "prompt", (username) => {
      if (!username) {
        ctx.appendOutput("Registration cancelled.", "error");
        return;
      }
      setTerminalPrompt(ctx, "New Password: ", "password", async (password) => {
        ctx.dispatch({ type: "SET_PROCESSING", payload: true });
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alias: username, name: username, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          ctx.appendOutput("Registration successful. You can now 'login'.", "system");
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          ctx.appendOutput(`Registration failed: ${msg}`, "error");
        } finally {
          ctx.dispatch({ type: "SET_PROCESSING", payload: false });
        }
      });
    });
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
      
      if (data.isCorrect) {
        ctx.appendOutput(
          <div style={{ color: "var(--neon-green)" }}>
            [SUCCESS] Correct flag! You gained {data.pointsGained} points.
          </div>
        );
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
    if (!ctx.session?.user) {
      ctx.appendOutput("You must be logged in to use hints.", "error");
      return;
    }
    const challengeId = args[0];
    if (!challengeId) {
      ctx.appendOutput("Usage: hint <challenge_id>", "error");
      return;
    }

    ctx.dispatch({ type: "SET_PROCESSING", payload: true });
    try {
      // First fetch hints to see if any exist
      const res = await fetch(`/api/hints?challengeId=${challengeId}`);
      const hints = await res.json();
      if (!hints || hints.length === 0) {
        ctx.appendOutput("No hints available for this challenge.", "error");
        return;
      }

      ctx.appendOutput(
        <div style={{ border: "1px dashed var(--neon-amber)", padding: "10px", margin: "10px 0" }}>
          <strong style={{ color: "var(--neon-amber)" }}>Available Hints for {challengeId}:</strong>
          <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
            {(hints as { id: string, cost: number, isUnlocked: boolean, content: string }[]).map((h, i) => (
              <li key={h.id}>
                Hint #{i + 1} ({h.cost} points) - {h.isUnlocked ? <span style={{color: "var(--neon-green)"}}>[UNLOCKED]: {h.content}</span> : "[LOCKED]"}
              </li>
            ))}
          </ul>
        </div>
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      ctx.appendOutput(`Error: ${msg}`, "error");
    } finally {
      ctx.dispatch({ type: "SET_PROCESSING", payload: false });
    }
  }
};
