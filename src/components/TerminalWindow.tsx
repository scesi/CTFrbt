"use client";

import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import CRTSettings from "./CRTSettings";

export default function TerminalWindow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <div className="terminal-window">
        {/* ---- Title Bar ---- */}
        <div className="title-bar">
          <div className="window-controls">
            <button type="button" className="window-btn close" aria-label="Close" disabled />
            <button type="button" className="window-btn minimize" aria-label="Minimize" disabled />
            <button type="button" className="window-btn maximize" aria-label="Maximize" disabled />
          </div>

          <span className="title-text">guest@ctfrbt: ~</span>

          <div className="title-actions">
            <CRTSettings />
          </div>
        </div>

        {/* ---- Window Body ---- */}
        <div className="window-body">
          <Sidebar />
          <div className="main-panel">
            <div className="main-content">{children}</div>
          </div>
        </div>

        {/* ---- Status Bar ---- */}
        <StatusBar />
      </div>
    </div>
  );
}
