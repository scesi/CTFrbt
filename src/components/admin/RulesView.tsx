"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function RulesView() {
  const [rules, setRules] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rules");
      if (!res.ok) {
        toast.error("Failed to load rules");
        return;
      }
      const data = await res.json();
      setRules(data.rules || "");
    } catch {
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const saveRules = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save rules");
        return;
      }

      toast.success("Rules saved successfully");
    } catch {
      toast.error("Failed to save rules");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Competition Rules</h2>
        <button
          onClick={saveRules}
          className="btn btn-primary"
          disabled={saving}
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          {saving ? "Saving..." : "Save Rules"}
        </button>
      </div>

      <div className="card">
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Enter competition rules here (supports Markdown)..."
          rows={12}
          style={{
            width: "100%",
            fontSize: "13px",
            fontFamily: "var(--font-mono)",
            background: "transparent",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: "0",
            padding: "12px",
            resize: "vertical",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}
