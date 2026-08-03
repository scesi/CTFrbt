"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import UsersView from "./admin/UsersView";
import TeamsView from "./admin/TeamsView";
import GameConfiguration from "./admin/GameConfiguration";
import RulesView from "./admin/RulesView";
import SubmissionsView from "./admin/SubmissionsView";
import LogsView from "./admin/LogsView";
import LoadingSpinner from "./admin/loading/LoadingSpinner";
import AdminTabs from "./admin/AdminTabs";
import AdminHeader from "./admin/AdminHeader";

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

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("challenges");
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

  // Announcement
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  // Suggestions for the category input: the usual set plus anything already
  // in use, so custom categories are reusable without editing code.
  const categoryOptions = Array.from(
    new Set([
      "web",
      "crypto",
      "pwn",
      "forensics",
      "reverse",
      "misc",
      ...challenges.map((c) => c.category),
    ]),
  );

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
      const res = await fetch(`/api/admin/challenges/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update challenge");
        return;
      }
      loadChallenges();
      toast.success(`Challenge ${!isActive ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update challenge");
    }
  };

  const deleteChallenge = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/challenges/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete challenge");
        return;
      }
      loadChallenges();
      toast.success("Challenge deleted");
    } catch {
      toast.error("Failed to delete challenge");
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
      loadAnnouncements();
    } catch {
      toast.error("Network error");
    }
  };

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) {
        toast.error("Failed to load announcements");
        return;
      }
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const deleteAnnouncement = async (id: string, title: string) => {
    if (!confirm(`Delete announcement "${title}"? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete announcement");
        return;
      }
      toast.success("Announcement deleted");
      loadAnnouncements();
    } catch {
      toast.error("Failed to delete announcement");
    }
  };

  useEffect(() => {
    if (session?.user?.isAdmin) loadAnnouncements();
  }, [session, loadAnnouncements]);

  const handleExport = async () => {
    try {
      const res = await fetch("/api/admin/export");
      if (!res.ok) {
        toast.error("Failed to export data");
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ctfrbt-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "Importing data will replace all existing challenges, users, teams, announcements, and game configuration. This cannot be undone. Are you sure?",
      )
    ) {
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to import data");
        return;
      }

      toast.success("Data imported successfully");
      loadChallenges();
    } catch {
      toast.error("Failed to import data - invalid file format");
    } finally {
      e.target.value = "";
    }
  };

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  if (!session?.user?.isAdmin) return null;

  return (
    <div style={{ paddingTop: "8px" }}>
      <AdminHeader onImport={handleImport} onExport={handleExport} />

      {/* Tab Navigation */}
      <AdminTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Tab Content */}

      {/* Challenges Tab */}
      {activeTab === "challenges" && (
        <>
          {/* Challenges header */}
          <div
            style={{
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
              Challenges ({challenges.length})
            </h2>
            <button className="btn" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New Challenge"}
            </button>
          </div>

          {/* New challenge form */}
          {showForm && (
            <div className="card" style={{ marginBottom: "16px" }}>
              <form onSubmit={createChallenge}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
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
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Description"
                  required
                  rows={4}
                  style={{ marginBottom: "10px", resize: "vertical" }}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <input
                    type="number"
                    className="form-input"
                    value={form.points}
                    onChange={(e) =>
                      setForm({ ...form, points: Number(e.target.value) })
                    }
                    placeholder="Points"
                    required
                    min={1}
                  />
                  <input
                    type="text"
                    className="form-input"
                    list="admin-category-options"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    placeholder="Category"
                    required
                  />
                  <datalist id="admin-category-options">
                    {categoryOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <select
                    className="form-input"
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm({ ...form, difficulty: e.target.value })
                    }
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
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
        </>
      )}

      {/* Users Tab */}
      {activeTab === "users" && <UsersView currentUserId={session?.user?.id} />}

      {/* Teams Tab */}
      {activeTab === "teams" && <TeamsView />}

      {/* Submissions Tab */}
      {activeTab === "submissions" && <SubmissionsView />}

      {/* Logs Tab */}
      {activeTab === "logs" && <LogsView />}

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <>
          <div className="card" style={{ marginBottom: "20px" }}>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
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
                style={{ marginBottom: "8px" }}
              />
              <textarea
                className="form-input"
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="Content"
                required
                rows={3}
                style={{ marginBottom: "8px", resize: "vertical" }}
              />
              <button type="submit" className="btn btn-primary">
                Publish
              </button>
            </form>
          </div>

          {/* Announcements List */}
          <div className="card">
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Published Announcements
            </h2>
            {announcementsLoading ? (
              <LoadingSpinner />
            ) : announcements.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
                No announcements yet
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    style={{
                      border: "1px solid var(--border)",
                      padding: "12px",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            marginBottom: "4px",
                          }}
                        >
                          {announcement.title}
                        </h3>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--fg-muted)",
                            lineHeight: 1.5,
                            marginBottom: "6px",
                          }}
                        >
                          {announcement.content}
                        </p>
                        <p style={{ fontSize: "11px", color: "var(--fg-dim)" }}>
                          Created:{" "}
                          {new Date(announcement.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          deleteAnnouncement(
                            announcement.id,
                            announcement.title,
                          )
                        }
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border)",
                          color: "var(--danger)",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          padding: "4px 8px",
                          borderRadius: "0",
                        }}
                      >
                        delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Game Configuration Tab */}
      {activeTab === "configuration" && (
        <>
          <GameConfiguration />

          <div className="card" style={{ marginTop: "20px" }}>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Rules
            </h2>
            <RulesView />
          </div>
        </>
      )}
    </div>
  );
}
