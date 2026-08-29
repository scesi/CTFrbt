"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          fontWeight: 700,
          color: "var(--danger)",
          marginBottom: "16px",
          fontFamily: "var(--font-mono)",
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "var(--fg)",
          marginBottom: "16px",
        }}
      >
        Page Not Found
      </h2>
      <p
        style={{
          color: "var(--fg-dim)",
          fontSize: "14px",
          marginBottom: "32px",
          maxWidth: "400px",
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="btn btn-primary"
        style={{
          textDecoration: "none",
        }}
      >
        Return to Home
      </Link>
    </div>
  );
}
