vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { afterAll, describe, expect, it, vi } from "vitest";
import AdmZip from "adm-zip";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { GET, POST } from "@/app/api/admin/backup/route";
import { prisma, resetDb } from "../helpers/db";
import {
  createAdminUser,
  createChallenge,
  createMultiFlagChallenge,
  createUserWithTeam,
  hashPassword,
  mockNoSession,
  mockSession,
} from "../helpers/factories";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

const zipFromResponse = async (res: Response): Promise<AdmZip> =>
  new AdmZip(Buffer.from(await res.arrayBuffer()));

const backupRequest = (file: Buffer, extra: Record<string, string> = {}) => {
  const form = new FormData();
  form.set("file", new Blob([file]), "backup.zip");
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return new Request("http://localhost/api/admin/backup", {
    method: "POST",
    body: form,
  });
};

const zipWith = (entries: Record<string, Buffer>): Buffer => {
  const zip = new AdmZip();
  for (const [name, data] of Object.entries(entries)) zip.addFile(name, data);
  return zip.toBuffer();
};

// adm-zip sanitizes entry names on creation (it rewrites "../evil.txt" to
// "evil.txt"), so path-traversal zips are built by hand: a valid STORED zip
// that preserves entry names exactly as given.
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf: Buffer): number => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const zipWithRawNames = (entries: Array<[string, Buffer]>): Buffer => {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, data);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0x21, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);

    offset += 30 + nameBuf.length + data.length;
  }

  const centralStart = chunks.reduce((n, b) => n + b.length, 0);
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuf, eocd]);
};

describe("admin backup/restore", () => {
  afterAll(async () => {
    await fs.rm(UPLOADS_DIR, { recursive: true, force: true });
  });

  it("GET returns 403 without a session", async () => {
    mockNoSession();
    expect((await GET()).status).toBe(403);
  });

  it("POST returns 403 without a session", async () => {
    mockNoSession();
    const res = await POST(backupRequest(Buffer.from("x")));
    expect(res.status).toBe(403);
  });

  it("GET returns 403 for a non-admin session", async () => {
    const user = await createAdminUser({ isAdmin: false });
    mockSession({ id: user.id, isAdmin: false });
    expect((await GET()).status).toBe(403);
  });

  it("GET returns a zip containing a sql dump", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("zip");

    const names = (await zipFromResponse(res))
      .getEntries()
      .map((e) => e.entryName);
    expect(names).toContain("dump.sql");
  });

  it("GET includes uploaded files in the zip", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const rel = "uploads/spec-upload.txt";
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(PUBLIC_DIR, rel), "attachment-body");
    const challenge = await createChallenge();
    await prisma.challengeFile.create({
      data: {
        name: "spec-upload.txt",
        path: rel,
        size: 15,
        challengeId: challenge.id,
      },
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const names = (await zipFromResponse(res))
      .getEntries()
      .map((e) => e.entryName);
    expect(names).toContain(rel);
  });

  it("POST rejects a restore without an explicit confirm", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      backupRequest(zipWith({ "dump.sql": Buffer.from("-- dump") })),
    );
    expect(res.status).toBe(400);
  });

  it("POST rejects a payload that is not a zip", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      backupRequest(Buffer.from("not-a-zip"), { confirm: "true" }),
    );
    expect(res.status).toBe(400);
  });

  it("POST rejects a zip without a sql dump", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      backupRequest(zipWith({ "notes.txt": Buffer.from("hi") }), {
        confirm: "true",
      }),
    );
    expect(res.status).toBe(400);
  });

  // The implementer must cap the number of entries below this threshold.
  it("POST rejects a zip-bomb with too many entries", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const zip = new AdmZip();
    zip.addFile("dump.sql", Buffer.from("-- dump"));
    for (let i = 0; i < 10_001; i++) zip.addFile(`e/${i}`, Buffer.alloc(0));

    const res = await POST(backupRequest(zip.toBuffer(), { confirm: "true" }));
    expect(res.status).toBe(400);
  });

  it("POST rejects entries with path traversal", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const zip = zipWithRawNames([
      ["dump.sql", Buffer.from("-- dump")],
      ["../evil.txt", Buffer.from("pwned")],
    ]);

    const res = await POST(backupRequest(zip, { confirm: "true" }));
    expect(res.status).toBe(400);
  });

  it("round-trips a populated database and its uploads faithfully", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const PASSWORD = "roundtrip-pass";
    const { user, team } = await createUserWithTeam({
      password: await hashPassword(PASSWORD),
    });
    await prisma.team.update({ where: { id: team.id }, data: { score: 250 } });
    const challenge = await createMultiFlagChallenge([
      { flag: "flag{a}", points: 25 },
      { flag: "flag{b}", points: 50 },
    ]);
    await prisma.submission.create({
      data: {
        flag: "flag{a}",
        isCorrect: true,
        userId: user.id,
        teamId: team.id,
        challengeId: challenge.id,
      },
    });
    await prisma.score.create({
      data: {
        points: 25,
        userId: user.id,
        teamId: team.id,
        challengeId: challenge.id,
      },
    });
    const rel = "uploads/roundtrip-file.txt";
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(PUBLIC_DIR, rel), "roundtrip-content");
    await prisma.challengeFile.create({
      data: {
        name: "roundtrip-file.txt",
        path: rel,
        size: 16,
        challengeId: challenge.id,
      },
    });

    const backupRes = await GET();
    expect(backupRes.status).toBe(200);
    const zip = Buffer.from(await backupRes.arrayBuffer());

    // Wipe everything: DB + uploaded files.
    await resetDb();
    await fs.rm(UPLOADS_DIR, { recursive: true, force: true });

    const restore = await POST(backupRequest(zip, { confirm: "true" }));
    expect(restore.status).toBe(200);

    const restored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(restored).not.toBeNull();
    if (!restored) throw new Error("user was not restored");
    expect(await bcrypt.compare(PASSWORD, restored.password)).toBe(true);

    const restoredTeam = await prisma.team.findUnique({
      where: { id: team.id },
    });
    expect(restoredTeam?.score).toBe(250);

    const restoredFlags = await prisma.challengeFlag.findMany({
      where: { challengeId: challenge.id },
    });
    expect(restoredFlags.map((f) => f.flag).sort()).toEqual(
      ["flag{a}", "flag{b}"].sort(),
    );

    const fileBack = await fs
      .readFile(path.join(PUBLIC_DIR, rel), "utf8")
      .catch(() => null);
    expect(fileBack).toBe("roundtrip-content");
  });
});
