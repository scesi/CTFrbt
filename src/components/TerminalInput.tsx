"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTerminal } from "@/lib/terminal/TerminalContext";
import { useSession } from "next-auth/react";

export default function TerminalInput() {
  const { state, executeCommand } = useTerminal();
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus logic
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Do not steal focus if the user clicked on an interactive element
      if (target.closest("input, textarea, button, a")) return;

      // Small delay to allow text selection if user is dragging
      setTimeout(() => {
        if (!window.getSelection()?.toString()) {
          inputRef.current?.focus();
        }
      }, 50);
    };

    document.addEventListener("click", handleGlobalClick);
    inputRef.current?.focus();

    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (state.isProcessing) return;
      const cmd = input;
      setInput("");
      setHistoryIndex(-1);
      await executeCommand(cmd);
      // Wait for React to update the DOM, then scroll
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (state.isProcessing) return;
      
      const { getAutocompleteCandidates } = await import("@/lib/terminal/commands");
      const candidates = await getAutocompleteCandidates(input, state.cwd);
      
      if (candidates.length === 1) {
        const parts = input.split(" ");
        parts[parts.length - 1] = candidates[0];
        // If it's just a category/directory without extension, we might not want to append space
        // but for simplicity, we just append a space to keep typing flowing.
        setInput(parts.join(" ") + " ");
      } else if (candidates.length > 1) {
        // Optional: you could print candidates to the terminal, but for now we just 
        // autocomplete up to the common prefix or do nothing.
        // A simple common prefix logic:
        const commonPrefix = candidates.reduce((a, b) => {
          let i = 0;
          while (a[i] === b[i] && i < a.length) i++;
          return a.slice(0, i);
        });
        if (commonPrefix && commonPrefix !== input.split(" ").pop()) {
          const parts = input.split(" ");
          parts[parts.length - 1] = commonPrefix;
          setInput(parts.join(" "));
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      // ArrowUp history logic here - naive implementation: 
      // just extract the previous commands from history array
      const cmdHistory = state.history.filter((b) => b.type === "command");
      if (cmdHistory.length > 0) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < cmdHistory.length) {
          setHistoryIndex(nextIndex);
          // Commands format is: "user@ctfrbt:cwd$ command"
          // We need to extract just the command.
          const raw = cmdHistory[cmdHistory.length - 1 - nextIndex].content as string;
          const extracted = raw.split("$ ").slice(1).join("$ ");
          setInput(extracted);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const cmdHistory = state.history.filter((b) => b.type === "command");
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        const raw = cmdHistory[cmdHistory.length - 1 - nextIndex].content as string;
        const extracted = raw.split("$ ").slice(1).join("$ ");
        setInput(extracted);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const isPassword = state.inputMode === "password";
  const userPrefix = state.promptPrefix || `${session?.user?.alias || "guest"}@ctfrbt:${state.cwd}$ `;

  return (
    <div className="terminal-prompt-line" style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center" }}>
      <span className="prompt-prefix" style={{ color: "var(--fg-dim)", whiteSpace: "nowrap" }}>
        {userPrefix}
      </span>
      <input
        ref={inputRef}
        type={isPassword ? "password" : "text"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={state.isProcessing}
        autoComplete="off"
        spellCheck="false"
        autoFocus
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          color: "var(--fg)",
          fontFamily: "var(--font-mono)",
          fontSize: "1rem",
          outline: "none",
        }}
      />
    </div>
  );
}
