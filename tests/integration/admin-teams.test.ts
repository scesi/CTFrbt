vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/teams/route";
import { PATCH, DELETE } from "@/app/api/admin/teams/[id]/route";
import { prisma } from "../helpers/db";
import {
  createAdminUser,
  createTeam,
  createUserWithTeam,
  createChallenge,
  mockSession,
} from "../helpers/factories";

const json = (body: unknown, method = "PATCH") =>
  new Request("http://localhost/api/admin/teams", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("admin teams", () => {
  it("GET lists teams with member count", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const { team } = await createUserWithTeam();

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    const match = body.teams.find((t: { id: string }) => t.id === team.id);
    expect(match).toBeDefined();
    expect(match._count?.members).toBe(1);
  });

  it("PATCH updates name, icon and color", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    mockSession(admin);

    const res = await PATCH(
      json({ name: "Renamed", icon: "GiSkull", color: "#ff0000" }),
      params(team.id),
    );
    expect(res.status).toBe(200);

    const updated = await prisma.team.findUnique({ where: { id: team.id } });
    expect(updated?.name).toBe("Renamed");
    expect(updated?.icon).toBe("GiSkull");
    expect(updated?.color).toBe("#ff0000");
  });

  it("PATCH rejects a duplicated team code with 409", async () => {
    const admin = await createAdminUser();
    const teamA = await createTeam();
    const teamB = await createTeam();
    mockSession(admin);

    const res = await PATCH(json({ code: teamA.code }), params(teamB.id));
    expect(res.status).toBe(409);
  });

  it("PATCH rejects an empty or oversized code", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    mockSession(admin);

    const empty = await PATCH(json({ code: "" }), params(team.id));
    expect(empty.status).toBe(400);

    const oversized = await PATCH(
      json({ code: "1234567890123" }),
      params(team.id),
    );
    expect(oversized.status).toBe(400);
  });

  it("PATCH rejects an oversized name", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    mockSession(admin);

    const res = await PATCH(json({ name: "x".repeat(33) }), params(team.id));
    expect(res.status).toBe(400);
  });

  it("PATCH rejects an empty name", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    mockSession(admin);

    const res = await PATCH(json({ name: "" }), params(team.id));
    expect(res.status).toBe(400);
  });

  it("DELETE detaches members and removes the team", async () => {
    const admin = await createAdminUser();
    const { user, team } = await createUserWithTeam();
    mockSession(admin);

    const res = await DELETE(json({}, "DELETE"), params(team.id));
    expect(res.status).toBe(200);

    const gone = await prisma.team.findUnique({ where: { id: team.id } });
    expect(gone).toBeNull();

    const member = await prisma.user.findUnique({ where: { id: user.id } });
    expect(member?.teamId).toBeNull();
  });

  it("DELETE a nonexistent team returns 404", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await DELETE(json({}, "DELETE"), params("nope"));
    expect(res.status).toBe(404);
  });

  it("DELETE a team with submissions succeeds", async () => {
    const admin = await createAdminUser();
    const { user, team } = await createUserWithTeam();
    const challenge = await createChallenge();
    mockSession(admin);

    await prisma.submission.create({
      data: {
        flag: "flag{x}",
        isCorrect: false,
        userId: user.id,
        challengeId: challenge.id,
        teamId: team.id,
      },
    });

    const res = await DELETE(json({}, "DELETE"), params(team.id));
    expect(res.status).toBe(200);
  });
});
