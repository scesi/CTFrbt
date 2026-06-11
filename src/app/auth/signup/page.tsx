"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SignUp() {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      toast.success("Account created! Please sign in.");
      router.push("/auth/signin");
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", paddingTop: "48px" }}>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          marginBottom: "8px",
          letterSpacing: "0.5px",
        }}
      >
        Register
      </h1>
      <p
        style={{
          color: "var(--fg-dim)",
          fontSize: "13px",
          marginBottom: "32px",
        }}
      >
        Create an account to participate in challenges.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="signup-alias"
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--fg-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Alias
          </label>
          <input
            id="signup-alias"
            type="text"
            className="form-input"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="h4ck3r"
            required
            autoComplete="username"
            maxLength={32}
          />
          <span
            style={{
              fontSize: "11px",
              color: "var(--fg-dim)",
              marginTop: "4px",
              display: "block",
            }}
          >
            Unique identifier. Max 32 characters.
          </span>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="signup-name"
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--fg-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Display Name
          </label>
          <input
            id="signup-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            maxLength={48}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="signup-password"
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--fg-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label
            htmlFor="signup-confirm"
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--fg-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Confirm Password
          </label>
          <input
            id="signup-confirm"
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", marginBottom: "16px" }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p
        style={{
          fontSize: "13px",
          color: "var(--fg-dim)",
          textAlign: "center",
        }}
      >
        Already have an account?{" "}
        <Link href="/auth/signin" style={{ color: "var(--fg-muted)" }}>
          Sign In
        </Link>
      </p>
    </div>
  );
}
