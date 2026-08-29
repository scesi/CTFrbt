"use client";

import GameTimer from "./admin/GameTimer";

export default function StatusBar() {
  return (
    <footer className="status-bar">
      <div className="status-item">
        <GameTimer variant="statusbar" />
      </div>

      <div className="status-item">
        <span style={{ color: "var(--fg-dim)" }}>
          Developed by{" "}
          <strong style={{ color: "var(--fg-muted)" }}>Stevenjoelrs</strong>
        </span>
      </div>

      <div className="status-item">
        <span>CTFrbt v1.0.4</span>
      </div>
    </footer>
  );
}
