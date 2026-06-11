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
            <button className="window-btn close" title="Close" />
            <button className="window-btn minimize" title="Minimize" />
            <button className="window-btn maximize" title="Maximize" />
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
