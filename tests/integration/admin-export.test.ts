vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/export/route";
import { prisma } from "../helpers/db";
import {
  createAdminUser,
  createUserWithTeam,
  createChallenge,
  setGameConfig,
  mockSession,
} from "../helpers/factories";

const json = (body: unknown) =>
  new Request("http://localhost/api/admin/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("admin export/import", () => {
  it("GET export returns content sections without users", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await createUserWithTeam();
    await createChallenge();

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.challenges)).toBe(true);
    expect(Array.isArray(body.teams)).toBe(true);
    expect(Array.isArray(body.announcements)).toBe(true);
    expect(body.users).toBeUndefined();
  });

  it("GET export does not leak credentials", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await createUserWithTeam();

    const res = await GET();
    const body = await res.json();

    expect(body.users).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("password");
  });

  it("GET export includes challenge flags", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await createChallenge({ flag: "flag{exported}" });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.challenges[0].flag).toBe("flag{exported}");
  });

  it("POST import rejects a mismatched Origin", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      new Request("http://localhost/api/admin/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://evil.example",
        },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Invalid request origin");
  });

  it("POST import rejects a cross-site Sec-Fetch-Site header", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      new Request("http://localhost/api/admin/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "cross-site",
        },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST import accepts an Origin matching NEXTAUTH_URL", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      new Request("http://localhost/api/admin/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("import merges a team into an existing one with the same code", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const seed = await prisma.team.create({
      data: { name: "Alpha", code: "SEED001" },
    });

    const res = await POST(
      json({
        teams: [
          {
            id: "cmsh4l6op0004qvhfwhoy3xvw",
            name: "Alpha",
            code: "SEED001",
            icon: "GiSpaceship",
            color: "#ff0000",
            score: 99,
          },
        ],
      }),
    );
    expect(res.status).toBe(200);

    const teams = await prisma.team.findMany();
    expect(teams).toHaveLength(1);
    expect(teams[0].id).toBe(seed.id);
    expect(teams[0].score).toBe(99);
    expect(teams[0].color).toBe("#ff0000");
  });

  it("import is idempotent when the team id already exists", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const seed = await prisma.team.create({
      data: { name: "Bravo", code: "SEED002" },
    });

    const res = await POST(
      json({
        teams: [
          {
            id: seed.id,
            name: "Bravo",
            code: "SEED002",
            score: 7,
          },
        ],
      }),
    );
    expect(res.status).toBe(200);

    const teams = await prisma.team.findMany();
    expect(teams).toHaveLength(1);
    expect(teams[0].id).toBe(seed.id);
    expect(teams[0].score).toBe(7);
  });

  it("import rejects duplicate team codes inside the payload", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      json({
        teams: [
          { id: "id-a", name: "Alpha", code: "DUP001" },
          { id: "id-b", name: "Beta", code: "DUP001" },
        ],
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("duplicate team code");
  });

  it("POST import rejects an empty payload", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({}));
    expect(res.status).toBe(400);
  });

  it("POST import rejects payloads that include users", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ users: [{ alias: "x", name: "y" }] }));
    expect(res.status).toBe(400);
  });

  it("round-trips a populated database without errors", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await createUserWithTeam();
    await createChallenge();
    await setGameConfig(
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const exported = await GET();
    const payload = await exported.json();
    expect(payload.users).toBeUndefined();

    const res = await POST(json(payload));
    expect(res.status).toBe(200);

    const teamCount = await prisma.team.count();
    const challengeCount = await prisma.challenge.count();
    expect(teamCount).toBeGreaterThan(0);
    expect(challengeCount).toBeGreaterThan(0);
  });

  it("import succeeds even when submissions/scores exist", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const { user, team } = await createUserWithTeam();
    const challenge = await createChallenge();
    await prisma.submission.create({
      data: {
        flag: "flag{old}",
        isCorrect: false,
        userId: user.id,
        challengeId: challenge.id,
        teamId: team.id,
      },
    });
    await prisma.score.create({
      data: {
        points: 100,
        userId: user.id,
        teamId: team.id,
        challengeId: challenge.id,
      },
    });

    const exported = await GET();
    const payload = await exported.json();

    const res = await POST(json(payload));
    expect(res.status).toBe(200);
  });

  it("import preserves a disabled challenge as disabled", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await createChallenge({ isActive: false });

    const exported = await GET();
    const payload = await exported.json();

    const res = await POST(json(payload));
    expect(res.status).toBe(200);

    const stored = await prisma.challenge.findFirst();
    expect(stored?.isActive).toBe(false);
  });

  it("import preserves challenge flags", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await createChallenge({ flag: "flag{keep}" });

    const exported = await GET();
    const payload = await exported.json();

    const res = await POST(json(payload));
    expect(res.status).toBe(200);

    const stored = await prisma.challenge.findFirst();
    expect(stored?.flag).toBe("flag{keep}");
  });
});
