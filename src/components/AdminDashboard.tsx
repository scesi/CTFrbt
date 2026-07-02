"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface Challenge {
  id: string;
  title: string;
  category: string;
  points: number;
  difficulty: string;
  isActive: boolean;
  isLocked: boolean;
  _count: { submissions: number };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // New challenge form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    points: 100,
    flag: "",
    category: "web",
    difficulty: "easy",
    link: "",
  });
  const [creating, setCreating] = useState(false);

  // Game config
  const [gameStart, setGameStart] = useState("");
  const [gameEnd, setGameEnd] = useState("");

  // Announcement
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && !session?.user?.isAdmin) router.push("/");
  }, [status, session, router]);

  const loadChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/challenges");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch {
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.isAdmin) loadChallenges();
  }, [session, loadChallenges]);

  const createChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Challenge "${form.title}" created`);
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        points: 100,
        flag: "",
        category: "web",
        difficulty: "easy",
        link: "",
      });
      loadChallenges();
    } catch {
      toast.error("Failed to create challenge");
    } finally {
      setCreating(false);
    }
  };

  const toggleChallenge = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/challenges/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadChallenges();
      toast.success(`Challenge ${!isActive ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update challenge");
    }
  };

  const deleteChallenge = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/admin/challenges/${id}`, { method: "DELETE" });
      loadChallenges();
      toast.success("Challenge deleted");
    } catch {
      toast.error("Failed to delete challenge");
    }
  };

  const updateGameConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: gameStart,
          endTime: gameEnd || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to update game config");
        return;
      }
      toast.success("Game config updated");
    } catch {
      toast.error("Network error");
    }
  };

  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: announcementTitle,
          content: announcementContent,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to create announcement");
        return;
      }
      toast.success("Announcement published");
      setAnnouncementTitle("");
      setAnnouncementContent("");
    } catch {
      toast.error("Network error");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div style={{ padding: "32px", color: "var(--fg-dim)" }}>Loading...</div>
    );
  }

  if (!session?.user?.isAdmin) return null;

  return (
    <div style={{ paddingTop: "8px" }}>
      <h1
        style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}
      >
        Admin Panel
      </h1>

      {/* Game Config */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
          Game Configuration
        </h2>
        <form
          onSubmit={updateGameConfig}
          style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}
        >
          <div>
            <label style={{ fontSize: "11px", color: "var(--fg-dim)", display: "block", marginBottom: "4px" }}>
              START
            </label>
            <input
              type="datetime-local"
              className="form-input"
              value={gameStart}
              onChange={(e) => setGameStart(e.target.value)}
              required
              style={{ width: "200px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--fg-dim)", display: "block", marginBottom: "4px" }}>
              END (optional)
            </label>
            <input
              type="datetime-local"
              className="form-input"
              value={gameEnd}
              onChange={(e) => setGameEnd(e.target.value)}
              style={{ width: "200px" }}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>
      </div>

      {/* Announcements */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
          New Announcement
        </h2>
        <form onSubmit={createAnnouncement}>
          <input
            type="text"
            className="form-input"
            value={announcementTitle}
            onChange={(e) => setAnnouncementTitle(e.target.value)}
            placeholder="Title"
            required
	    maxLength={100}
            style={{ marginBottom: "8px" }}
          />
          <textarea
            className="form-input"
            value={announcementContent}
            onChange={(e) => setAnnouncementContent(e.target.value)}
            placeholder="Content"
            required
            rows={3}
	    maxLength={2000}
            style={{ marginBottom: "8px", resize: "vertical" }}
          />
          <button type="submit" className="btn btn-primary">
            Publish
          </button>
        </form>
      </div>

      {/* Challenges */}
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
          Challenges ({challenges.length})
        </h2>
        <button
          className="btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ New Challenge"}
        </button>
      </div>

      {/* New challenge form */}
      {showForm && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <form onSubmit={createChallenge}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                required
              />
              <input
                type="text"
                className="form-input"
                value={form.flag}
                onChange={(e) => setForm({ ...form, flag: e.target.value })}
                placeholder="flag{...}"
                required
              />
            </div>
            <textarea
              className="form-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              required
              rows={4}
              style={{ marginBottom: "10px", resize: "vertical" }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <input
                type="number"
                className="form-input"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                placeholder="Points"
                required
                min={1}
              />
              <select
                className="form-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="web">Web</option>
                <option value="crypto">Crypto</option>
                <option value="pwn">Pwn</option>
                <option value="forensics">Forensics</option>
                <option value="reverse">Reverse</option>
                <option value="misc">Misc</option>
              </select>
              <select
                className="form-input"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="insane">Insane</option>
              </select>
              <input
                type="url"
                className="form-input"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="Link (optional)"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? "Creating..." : "Create Challenge"}
            </button>
          </form>
        </div>
      )}

      {/* Challenges table */}
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th style={{ textAlign: "right" }}>Pts</th>
            <th>Diff</th>
            <th style={{ textAlign: "right" }}>Solves</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {challenges.map((c) => (
            <tr key={c.id}>
              <td style={{ fontWeight: 500 }}>{c.title}</td>
              <td>{c.category}</td>
              <td style={{ textAlign: "right" }}>{c.points}</td>
              <td>{c.difficulty}</td>
              <td style={{ textAlign: "right" }}>{c._count.submissions}</td>
              <td>
                <span
                  style={{
                    color: c.isActive ? "var(--success)" : "var(--danger)",
                    fontSize: "12px",
                  }}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <button
                  onClick={() => toggleChallenge(c.id, c.isActive)}
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
                  {c.isActive ? "disable" : "enable"}
                </button>
                <button
                  onClick={() => deleteChallenge(c.id, c.title)}
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
    </div>
  );
}
