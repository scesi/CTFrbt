import { execSync } from "child_process";

// Runs once before the integration project. Applies migrations to the test
// database so every suite starts against an up-to-date schema.
export default function setup() {
  const url = process.env.DATABASE_URL;

  // Hard guard: never migrate/truncate anything that isn't a test DB.
  if (!url || !/test/i.test(url)) {
    throw new Error(
      "Refusing to run integration tests: DATABASE_URL must point to a test database (name must contain 'test').",
    );
  }

  // Keep the runner output clean: capture migrate output and only surface it
  // if the command actually fails.
  try {
    execSync("pnpm exec prisma migrate deploy", {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: url },
    });
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer };
    if (e.stdout) process.stdout.write(e.stdout);
    if (e.stderr) process.stderr.write(e.stderr);
    throw err;
  }
}
