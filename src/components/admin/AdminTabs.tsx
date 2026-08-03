"use client";

interface AdminTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        marginBottom: "20px",
        paddingBottom: "8px",
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap",
      }}
    >
      {/* Tab Navigation */}
      <button
        onClick={() => onTabChange("challenges")}
        style={{
          padding: "8px 16px",
          fontSize: "13px",
          fontFamily: "var(--font-mono)",
          background: activeTab === "challenges" ? "#8a2be2" : "transparent",
          color: activeTab === "challenges" ? "#000000" : "var(--fg)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          borderRadius: "0",
        }}
      >
        Challenges
      </button>
      <button
        onClick={() => onTabChange("users")}
        style={{
          padding: "8px 16px",
          fontSize: "13px",
          fontFamily: "var(--font-mono)",
          background: activeTab === "users" ? "#8a2be2" : "transparent",
          color: activeTab === "users" ? "#000000" : "var(--fg)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          borderRadius: "0",
        }}
      >
        Users
      </button>
      <button
        onClick={() => onTabChange("teams")}
        style={{
          padding: "8px 16px",
          fontSize: "13px",
          fontFamily: "var(--font-mono)",
          background: activeTab === "teams" ? "#8a2be2" : "transparent",
          color: activeTab === "teams" ? "#000000" : "var(--fg)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          borderRadius: "0",
        }}
      >
        Teams
      </button>
      <button
        onClick={() => onTabChange("submissions")}
        style={{
          padding: "8px 16px",
          fontSize: "13px",
          fontFamily: "var(--font-mono)",
          background: activeTab === "submissions" ? "#8a2be2" : "transparent",
          color: activeTab === "submissions" ? "#000000" : "var(--fg)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          borderRadius: "0",
        }}
      >
        Submissions
      </button>
      <button
        onClick={() => onTabChange("logs")}
        style={{
          padding: "8px 16px",
          fontSize: "13px",
          fontFamily: "var(--font-mono)",
          background: activeTab === "logs" ? "#8a2be2" : "transparent",
          color: activeTab === "logs" ? "#000000" : "var(--fg)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          borderRadius: "0",
        }}
      >
        Logs
      </button>
      <button
        onClick={() => onTabChange("announcements")}
        style={{
          padding: "8px 16px",
          fontSize: "13px",
          fontFamily: "var(--font-mono)",
          background: activeTab === "announcements" ? "#8a2be2" : "transparent",
          color: activeTab === "announcements" ? "#000000" : "var(--fg)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          borderRadius: "0",
        }}
      >
        Announcements
      </button>
      <button
        onClick={() => onTabChange("configuration")}
        style={{
          padding: "8px 16px",
          fontSize: "13px",
          fontFamily: "var(--font-mono)",
          background: activeTab === "configuration" ? "#8a2be2" : "transparent",
          color: activeTab === "configuration" ? "#000000" : "var(--fg)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          borderRadius: "0",
        }}
      >
        Game Configuration
      </button>
    </div>
  );
}
