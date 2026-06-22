"use client";

import { useEffect, useState, useCallback } from "react";

export default function Rules() {
  const [rules, setRules] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      setRules(data.rules || "");
    } catch (error) {
      console.error("Failed to load rules:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

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
        Loading rules...
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "8px" }}>
      <h1
        style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}
      >
        Rules
      </h1>

      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.8,
          color: "var(--fg-muted)",
          whiteSpace: "pre-wrap",
          maxWidth: "700px",
        }}
      >
        {rules}
      </div>
    </div>
  );
}
