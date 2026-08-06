import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";

const run = promisify(execFile);

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

// Restore guards: reject zip-bombs and absolute/traversal entry names.
const MAX_ZIP_ENTRIES = 10_000;
const MAX_TOTAL_UNCOMPRESSED = 500 * 1024 * 1024;
const MAX_PROCESS_BUFFER = 100 * 1024 * 1024;

// Homebrew's libpq keg is not on PATH by default, yet pg_dump/psql ship there.
// Look for them in the well-known prefixes first and fall back to whatever
// PATH provides (Docker/CI), so backup/restore work without shell tweaks.
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

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return url;
}

// Minimal CSRF guard, mirroring the export route: reject explicit cross-site
// signals or a mismatching Origin. Missing headers remain allowed because
// tests and non-browser clients may omit them.
function csrfGuard(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (origin) {
    const expected = new URL(request.url).origin;
    if (origin !== expected) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 },
      );
    }
  }
  if (request.headers.get("Sec-Fetch-Site") === "cross-site") {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  }
  return null;
}

// Stages every file under uploads/ as a zip entry named after its path
// relative to public/ (i.e. "uploads/<...>", matching ChallengeFile.path).
async function addUploadsToZip(zip: AdmZip): Promise<void> {
  const stack = [UPLOADS_DIR];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    const entries = await fs
      .readdir(dir, { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile()) {
        const data = await fs.readFile(abs);
        zip.addFile(
          path.relative(PUBLIC_DIR, abs).split(path.sep).join("/"),
          data,
        );
      }
    }
  }
}

// GET /api/admin/backup - Full backup as a zip: dump.sql (database state,
// including password hashes) plus every uploaded file.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return forbidden();

  try {
    const { stdout: dump } = await run(
      "pg_dump",
      [
        databaseUrl(),
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
      ],
      { maxBuffer: MAX_PROCESS_BUFFER, env: pgToolEnv() },
    );

    const zip = new AdmZip();
    zip.addFile("dump.sql", dump);
    await addUploadsToZip(zip);

    return new NextResponse(new Uint8Array(zip.toBuffer()), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="ctfrbt-backup.zip"',
      },
    });
  } catch (error) {
    console.error("Backup export error:", error);
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.replace(databaseUrl(), "***");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Returns a public/ path for a zip entry, or null when the entry name is
// unsafe (absolute paths, backslashes or ".." traversal).
function safeRestorePath(entryName: string): string | null {
  if (entryName.includes("\\")) return null;
  const normalized = path.posix.normalize(entryName);
  if (normalized === ".") return null;
  if (normalized === ".." || normalized.startsWith("../")) return null;
  if (path.posix.isAbsolute(normalized)) return null;
  const dest = path.resolve(PUBLIC_DIR, normalized);
  if (dest !== PUBLIC_DIR && !dest.startsWith(PUBLIC_DIR + path.sep)) {
    return null;
  }
  return dest;
}

// POST /api/admin/backup - Restore a backup previously produced by GET.
// Requires an explicit `confirm=true` so a restore is never triggered by
// accident. The database is replaced by dump.sql and uploaded files are
// written back under public/.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return forbidden();
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const dbUrl = databaseUrl();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form" },
      { status: 400 },
    );
  }

  if (form.get("confirm") !== "true") {
    return NextResponse.json(
      { error: "confirm=true is required" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file must be a zip" }, { status: 400 });
  }

  const raw = Buffer.from(await file.arrayBuffer());
  if (raw.length === 0) {
    return NextResponse.json({ error: "file is empty" }, { status: 400 });
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(raw);
  } catch {
    return NextResponse.json({ error: "Invalid zip file" }, { status: 400 });
  }

  const entries = zip.getEntries();
  if (entries.length === 0) {
    return NextResponse.json(
      { error: "Zip contains no entries" },
      { status: 400 },
    );
  }
  if (entries.length > MAX_ZIP_ENTRIES) {
    return NextResponse.json(
      { error: "Zip contains too many entries" },
      { status: 400 },
    );
  }

  // Pre-validate declared sizes before decompressing anything (zip-bombs).
  let totalUncompressed = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    totalUncompressed += entry.header.size;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
      return NextResponse.json(
        { error: "Zip decompressed size exceeds the limit" },
        { status: 400 },
      );
    }
  }

  const dumpEntry = entries.find((e) => e.entryName === "dump.sql");
  if (!dumpEntry || dumpEntry.isDirectory) {
    return NextResponse.json(
      { error: "Zip must contain a dump.sql" },
      { status: 400 },
    );
  }
  const dumpSql = zip.readFile(dumpEntry);
  if (!dumpSql || dumpSql.length === 0) {
    return NextResponse.json({ error: "dump.sql is empty" }, { status: 400 });
  }

  const restoreTargets: Array<{ name: string; dest: string }> = [];
  for (const entry of entries) {
    if (entry.isDirectory || entry.entryName === "dump.sql") continue;
    const dest = safeRestorePath(entry.entryName);
    if (!dest) {
      return NextResponse.json(
        { error: "Zip contains unsafe entry names" },
        { status: 400 },
      );
    }
    restoreTargets.push({ name: entry.entryName, dest });
  }

  // 1) Replace the database with the captured state.
  const tmpDump = path.join(os.tmpdir(), `ctfrbt-restore-${Date.now()}.sql`);
  await fs.writeFile(tmpDump, dumpSql);
  try {
    await run("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", tmpDump], {
      maxBuffer: MAX_PROCESS_BUFFER,
      env: pgToolEnv(),
    });
  } catch (error) {
    console.error("Backup restore error:", error);
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  } finally {
    await fs.rm(tmpDump, { force: true });
  }

  // 2) Write back the uploaded files.
  for (const target of restoreTargets) {
    const data = zip.readFile(target.name);
    if (!data) continue;
    await fs.mkdir(path.dirname(target.dest), { recursive: true });
    await fs.writeFile(target.dest, data);
  }

  return NextResponse.json({ message: "Backup restored successfully" });
}
