"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import styles from "./AdminDashboard.module.css";
import UsersView from "./UsersView";
import TeamsView from "./TeamsView";
import GameConfiguration from "./GameConfiguration";
import RulesView from "./RulesView";
import SubmissionsView from "./SubmissionsView";
import LogsView from "./LogsView";
import LoadingSpinner from "../ui/LoadingSpinner";
import AdminTabs from "./AdminTabs";
import AdminHeader from "./AdminHeader";
import AnnouncementsView, { type Announcement } from "./AnnouncementsView";
import ChallengesManagement, {
  type Challenge,
  type ChallengeForm,
} from "./ChallengesManagement";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("challenges");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // New challenge form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ChallengeForm>({
    title: "",
    description: "",
    points: 100,
    flag: "",
    category: "web",
    difficulty: "easy",
    link: "",
    hints: [],
  });
  const [creating, setCreating] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null);

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
      let res: Response;
      if (formFile) {
        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("description", form.description);
        formData.append("points", String(form.points));
        formData.append("flag", form.flag);
        formData.append("category", form.category);
        formData.append("difficulty", form.difficulty);
        if (form.link) formData.append("link", form.link);
        if (form.hints.length > 0) {
          formData.append("hints", JSON.stringify(form.hints));
        }
        formData.append("file", formFile);
        res = await fetch("/api/admin/challenges", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/admin/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
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
        hints: [],
      });
      setFormFile(null);
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
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete announcement");
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

  const handleExportSettings = async () => {
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

  const handleExportZip = async () => {
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) {
        toast.error("Failed to create backup");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ctfrbt-backup-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully");
    } catch {
      toast.error("Failed to create backup");
    }
  };

  const handleImportSettings = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "Importing data will update or create teams, users, and challenges. If the file contains announcements, existing announcements will be replaced. If it contains game configuration, the existing configuration will be replaced. Existing activity (submissions, scores, etc.) will be preserved. This cannot be undone. Are you sure?",
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

  const handleRestoreBackup = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "Restoring a backup will replace the entire database and all uploaded files with the backup contents. This cannot be undone. Are you sure?",
      )
    ) {
      e.target.value = "";
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("confirm", "true");

      const res = await fetch("/api/admin/backup", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to restore backup");
        return;
      }

      toast.success("Backup restored successfully");
      // The whole database and uploaded files were replaced, so reload to
      // drop every tab's cached data.
      window.setTimeout(() => window.location.reload(), 300);
    } catch {
      toast.error("Failed to restore backup - invalid file format");
    } finally {
      e.target.value = "";
    }
  };

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  if (!session?.user?.isAdmin) return null;

  return (
    <div className={styles.dashboard}>
      <AdminHeader
        onImportSettings={handleImportSettings}
        onImportZip={handleRestoreBackup}
        onExportSettings={handleExportSettings}
        onExportZip={handleExportZip}
      />

      {/* Tab Navigation */}
      <AdminTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Tab Content */}

      {/* Challenges Tab */}
      {activeTab === "challenges" && (
        <ChallengesManagement
          challenges={challenges}
          showForm={showForm}
          form={form}
          formFile={formFile}
          creating={creating}
          categoryOptions={categoryOptions}
          onToggleForm={() => setShowForm(!showForm)}
          onFormChange={setForm}
          onFormFileChange={setFormFile}
          onSubmit={createChallenge}
          onToggleChallenge={toggleChallenge}
          onDeleteChallenge={deleteChallenge}
        />
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
        <AnnouncementsView
          title={announcementTitle}
          content={announcementContent}
          announcements={announcements}
          loading={announcementsLoading}
          onTitleChange={setAnnouncementTitle}
          onContentChange={setAnnouncementContent}
          onSubmit={createAnnouncement}
          onDelete={deleteAnnouncement}
        />
      )}

      {/* Game Configuration Tab */}
      {activeTab === "configuration" && (
        <>
          <GameConfiguration />

          <div className={`card ${styles.rulesCard}`}>
            <h2 className={styles.rulesTitle}>Rules</h2>
            <RulesView />
          </div>
        </>
      )}
    </div>
  );
}
