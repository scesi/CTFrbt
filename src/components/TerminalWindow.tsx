"use client";

import StatusBar from "./StatusBar";
import CRTSettings from "./CRTSettings";
import { TerminalProvider, useTerminal } from "@/lib/terminal/TerminalContext";

function TerminalWindowContent({ children }: { children: React.ReactNode }) {
  const { state } = useTerminal();
  
  return (
    <div className="app-shell">
      <div className="terminal-window">
        {/* ---- Title Bar ---- */}
        <div className="title-bar">
          <div className="window-controls">
            <button className="window-btn close" title="Close" />
            <button className="window-btn minimize" title="Minimize" />
            <button className="window-btn maximize" title="Maximize" />
          </div>

          <span className="title-text">guest@ctfrbt: {state.cwd}</span>

          <div className="title-actions">
            <CRTSettings />
          </div>
        </div>

        {/* ---- Window Body ---- */}
        <div className="window-body">
          <div className="main-panel" style={{ width: "100%" }}>
            <div className="main-content" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {children}
            </div>
          </div>
        </div>

        {/* ---- Status Bar ---- */}
        <StatusBar />
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
