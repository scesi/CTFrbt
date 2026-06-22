"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SignIn() {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        alias,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          toast.error("Invalid credentials or too many attempts. Try again shortly.");
        } else {
          toast.error(result.error);
        }
      } else {
        toast.success("Signed in successfully");
        router.push("/dashboard");
        router.refresh();
      }
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
        Sign In
      </h1>
      <p
        style={{
          color: "var(--fg-dim)",
          fontSize: "13px",
          marginBottom: "32px",
        }}
      >
        Enter your credentials to access the platform.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="signin-alias"
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
            id="signin-alias"
            type="text"
            className="form-input"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="your_alias"
            required
            autoComplete="username"
            maxLength={32}
          />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label
            htmlFor="signin-password"
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
            id="signin-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", marginBottom: "16px" }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p
        style={{
          fontSize: "13px",
          color: "var(--fg-dim)",
          textAlign: "center",
        }}
      >
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" style={{ color: "var(--fg-muted)" }}>
          Register
        </Link>
      </p>
    </div>
  );
}
