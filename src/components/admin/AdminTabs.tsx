"use client";

import styles from "./AdminTabs.module.css";

interface AdminTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "challenges", label: "Challenges" },
  { id: "users", label: "Users" },
  { id: "teams", label: "Teams" },
  { id: "submissions", label: "Submissions" },
  { id: "logs", label: "Logs" },
  { id: "announcements", label: "Announcements" },
  { id: "configuration", label: "Game Configuration" },
];

export default function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div className={styles.tabsContainer}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={
            activeTab === tab.id
              ? `${styles.tabButton} ${styles.tabButtonActive}`
              : styles.tabButton
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
