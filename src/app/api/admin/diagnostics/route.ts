import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";

const run = promisify(execFile);

const PG_TOOL_PATHS = [
  "/opt/homebrew/opt/libpq/bin",
  "/usr/local/opt/libpq/bin",
  "/usr/lib/postgresql/18/bin",
].filter((dir) => existsSync(dir));

function pgToolEnv() {
  return {
    ...process.env,
    PATH: [...PG_TOOL_PATHS, process.env.PATH ?? ""].filter(Boolean).join(":"),
  };
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return url;
}

function redact(message: string): string {
  return message.split(databaseUrl()).join("***");
}

async function runSafe(
  cmd: string,
  args: string[],
): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await run(cmd, args, {
      maxBuffer: 100 * 1024 * 1024,
      env: pgToolEnv(),
    });
    return { ok: true, output: redact(`${stdout}\n${stderr}`).trim() };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return { ok: false, output: redact(raw) };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (process.env.ENABLE_DIAGNOSTICS !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const version = await runSafe("pg_dump", ["--version"]);
  const probe = await runSafe("pg_dump", [
    databaseUrl(),
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--file",
    "/dev/null",
  ]);

  return NextResponse.json({
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    pgDump: version,
    probe,
  });
}
