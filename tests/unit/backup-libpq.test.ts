vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  const execFile = vi.fn(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      cb?: (err: Error | null, result: { stdout: string; stderr: string }) => void,
    ) => {
      process.nextTick(() => cb?.(null, { stdout: "ok", stderr: "" }));
    },
  );
  return { ...actual, execFile };
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { execFile } from "child_process";
import { GET } from "@/app/api/admin/backup/route";
import { getServerSession } from "next-auth";

const execMock = execFile as unknown as ReturnType<typeof vi.fn> & {
  mock: {
    calls: Array<
      [string, string[], { env: Record<string, string | undefined> }]
    >;
  };
};

describe("backup libpq env (raw special-char passwords)", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalUploads = process.env.UPLOADS_DIR;

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl;
    if (originalUploads === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = originalUploads;
    vi.clearAllMocks();
  });

  it("calls pg_dump with libpq env, no URL argument, and decoded password", async () => {
    process.env.DATABASE_URL =
      "postgresql://ctfrbt_dev:REDACTED@postgres:5432/ctfrbt_dev";
    process.env.UPLOADS_DIR = "/nonexistent/uploads";
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "a1", teamId: null, isAdmin: true },
    } as Awaited<ReturnType<typeof getServerSession>>);

    const res = await GET();
    expect(res.status).toBe(200);

    expect(execMock).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = execMock.mock.calls[0];
    expect(cmd).toBe("pg_dump");
    expect(args).not.toContain(process.env.DATABASE_URL);
    expect(opts.env.PGPASSWORD).toBe("REDACTED");
    expect(opts.env.PGUSER).toBe("ctfrbt_dev");
    expect(opts.env.PGHOST).toBe("postgres");
    expect(opts.env.PGPORT).toBe("5432");
    expect(opts.env.PGDATABASE).toBe("ctfrbt_dev");
  });

  it("falls back to the raw password when percent-decoding fails", async () => {
    process.env.DATABASE_URL =
      "postgresql://ctfrbt_dev:REDACTED@postgres:5432/ctfrbt_dev";
    process.env.UPLOADS_DIR = "/nonexistent/uploads";
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "a1", teamId: null, isAdmin: true },
    } as Awaited<ReturnType<typeof getServerSession>>);

    const res = await GET();
    expect(res.status).toBe(200);

    const [, , opts] = execMock.mock.calls[0];
    expect(opts.env.PGPASSWORD).toBe("REDACTED");
  });
});