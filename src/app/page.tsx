import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          marginBottom: "16px",
          letterSpacing: "1px",
        }}
      >
        Welcome to CTFrbt
      </h1>

      <p
        style={{
          color: "var(--fg-muted)",
          fontSize: "15px",
          lineHeight: 1.7,
          marginBottom: "32px",
          maxWidth: "600px",
        }}
      >
        A retro terminal-themed Capture The Flag platform. Navigate challenges
        using the file explorer on the left, submit flags, and climb the
        scoreboard.
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Link href="/auth/signup">
          <button className="btn btn-primary">Register</button>
        </Link>
        <Link href="/auth/signin">
          <button className="btn">Log In</button>
        </Link>
        <Link href="/rules">
          <button className="btn">Rules</button>
        </Link>
      </div>

      <div
        style={{
          marginTop: "48px",
          padding: "20px",
          border: "1px solid var(--border)",
          width: "fit-content",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <pre
          style={{
            fontSize: "12px",
            color: "var(--fg-dim)",
            lineHeight: 1.5,
          }}
        >
          {`  ██████╗████████╗███████╗██████╗ ██████╗ ████████╗
 ██╔════╝╚══██╔══╝██╔════╝██╔══██╗██╔══██╗╚══██╔══╝
 ██║        ██║   █████╗  ██████╔╝██████╔╝   ██║   
 ██║        ██║   ██╔══╝  ██╔══██╗██╔══██╗   ██║   
 ╚██████╗   ██║   ██║     ██║  ██║██████╔╝   ██║   
  ╚═════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚═════╝    ╚═╝`}
        </pre>
      </div>
    </div>
  );
}
