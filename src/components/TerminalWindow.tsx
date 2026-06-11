"use client";

import { useState } from "react";
import StatusBar from "./StatusBar";
import CRTSettings from "./CRTSettings";
import { TerminalProvider, useTerminal } from "@/lib/terminal/TerminalContext";

function TerminalWindowContent({ children }: { children: React.ReactNode }) {
  const { state } = useTerminal();
  const [isMinimized, setIsMinimized] = useState(false);
  
  return (
    <div className="app-shell" style={isMinimized ? { alignItems: "flex-start", paddingTop: "20px" } : {}}>
      <div 
        className="terminal-window"
        style={isMinimized ? {
          height: "auto",
          background: "transparent",
          backdropFilter: "none",
          border: "none",
          boxShadow: "none",
          width: "96vw",
        } : {}}
      >
        {/* ---- Title Bar ---- */}
        <div className="title-bar" style={isMinimized ? { borderRadius: "10px", border: "1px solid var(--border)" } : {}}>
          <div className="window-controls">
            <button className="window-btn close" title="Close" />
            <button className="window-btn minimize" title="Minimize" onClick={() => setIsMinimized(true)} />
            <button className="window-btn maximize" title="Restore" onClick={() => setIsMinimized(false)} />
          </div>

          <span className="title-text">guest@ctfrbt: {state.cwd}</span>

          <div className="title-actions">
            <CRTSettings />
          </div>
        </div>

        {/* ---- Window Body ---- */}
        {!isMinimized && (
          <>
            <div className="window-body">
              <div className="main-panel" style={{ width: "100%" }}>
                <div className="main-content" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  {children}
                </div>
              </div>
            </div>

            {/* ---- Status Bar ---- */}
            <StatusBar />
          </>
        )}
      </div>
    </div>
  );
}

export default function TerminalWindow({ children }: { children: React.ReactNode }) {
  return (
    <TerminalProvider>
      <TerminalWindowContent>{children}</TerminalWindowContent>
    </TerminalProvider>
  );
}
