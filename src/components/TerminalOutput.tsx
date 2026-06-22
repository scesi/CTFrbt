"use client";

import React, { useEffect, useRef } from "react";
import { useTerminal } from "@/lib/terminal/TerminalContext";
import TerminalInput from "./TerminalInput";

export default function TerminalOutput() {
  const { state } = useTerminal();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new history
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.history]);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", flexGrow: 1, overflowY: "auto" }}>
      {state.history.map((block) => (
        <div 
          key={block.id} 
          style={{ 
            marginBottom: block.type === "command" ? "5px" : "15px",
            color: block.type === "error" ? "var(--neon-amber)" : 
                   block.type === "command" ? "var(--fg-dim)" : 
                   "var(--fg)"
          }}
        >
          {block.content}
        </div>
      ))}
      <TerminalInput />
      <div ref={bottomRef} style={{ height: "1px" }} />
    </div>
  );
}
