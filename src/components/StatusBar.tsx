"use client";

export default function StatusBar() {
  return (
    <footer className="status-bar">
      <div className="status-item">
        <span className="status-dot" />
        <span>ONLINE</span>
      </div>

      <div className="status-item">
        <span style={{ color: "var(--fg-dim)" }}>
          Type <strong style={{ color: "var(--fg-muted)" }}>help</strong> for
          commands
        </span>
      </div>

      <div className="status-item">
        <span>CTFrbt v0.1.0</span>
      </div>
    </footer>
  );
}
