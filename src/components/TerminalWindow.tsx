"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import CRTSettings from "./CRTSettings";

export default function TerminalWindow({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="app-shell">
      <div
        className="terminal-window"
        style={
          isMinimized
            ? {
                background: "transparent",
                backdropFilter: "none",
                border: "none",
                boxShadow: "none",
                pointerEvents: "none",
              }
            : {}
        }
      >
        <div
          className="title-bar"
          style={
            isMinimized
              ? {
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  pointerEvents: "auto",
                }
              : { pointerEvents: "auto" }
          }
        >
          <div className="window-controls">
            <button className="window-btn close" title="Close" />
            <button
              className="window-btn minimize"
              title="Minimize"
              onClick={() => setIsMinimized(true)}
            />
            <button
              className="window-btn maximize"
              title="Restore"
              onClick={() => setIsMinimized(false)}
            />
          </div>

          <span className="title-text">guest@ctfrbt: ~</span>

          <div className="title-actions">
            <CRTSettings />
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="window-body">
              <Sidebar session={session} />
              <div className="main-panel">
                <div className="main-content">{children}</div>
              </div>
            </div>

            <StatusBar />
          </>
        )}
      </div>
    </div>
  );
}
