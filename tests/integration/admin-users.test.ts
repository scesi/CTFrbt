vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/users/route";
import { PATCH, DELETE } from "@/app/api/admin/users/[id]/route";
import { prisma } from "../helpers/db";
import {
  createUser,
  createAdminUser,
  createTeam,
  createUserWithTeam,
  createChallenge,
  mockSession,
} from "../helpers/factories";

const json = (body: unknown, method = "PATCH") =>
  new Request("http://localhost/api/admin/users", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("admin users", () => {
  it("GET lists users with team and submission counts", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const { user, team } = await createUserWithTeam();

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    const match = body.users.find((u: { id: string }) => u.id === user.id);
    expect(match).toBeDefined();
    expect(match.team?.id).toBe(team.id);
    expect(match._count?.submissions).toBe(0);
  });

  it("PATCH updates the display name", async () => {
    const admin = await createAdminUser();
    const target = await createUser();
    mockSession(admin);

    const res = await PATCH(json({ name: "New Name" }), params(target.id));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.name).toBe("New Name");
  });

  it("PATCH toggles isAdmin and isTeamLeader for a user in a team", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    const target = await createUser({ teamId: team.id });
    mockSession(admin);

    const res = await PATCH(
      json({ isAdmin: true, isTeamLeader: true }),
      params(target.id),
    );
    expect(res.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated?.isAdmin).toBe(true);
    expect(updated?.isTeamLeader).toBe(true);
  });

  it("PATCH rejects promoting a user with no team", async () => {
    const admin = await createAdminUser();
    const target = await createUser();
    mockSession(admin);

    const res = await PATCH(
      json({ isTeamLeader: true }),
      params(target.id),
    );
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("team");
  });

  it("PATCH rejects promoting a second leader in the same team", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    await createUser({ teamId: team.id, isTeamLeader: true });
    const target = await createUser({ teamId: team.id });
    mockSession(admin);

    const res = await PATCH(
      json({ isTeamLeader: true }),
      params(target.id),
    );
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("leader");
  });

  it("PATCH rejects moving a leader into a team that already has a leader", async () => {
    const admin = await createAdminUser();
    const teamA = await createTeam();
    const teamB = await createTeam();
    const leaderA = await createUser({ teamId: teamA.id, isTeamLeader: true });
    await createUser({ teamId: teamB.id, isTeamLeader: true });
    mockSession(admin);

    const res = await PATCH(json({ teamId: teamB.id }), params(leaderA.id));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("leader");
  });

  it("PATCH moves a user to an existing team", async () => {
    const admin = await createAdminUser();
    const user = await createUser();
    const team = await createTeam();
    mockSession(admin);

    const res = await PATCH(json({ teamId: team.id }), params(user.id));
    expect(res.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.teamId).toBe(team.id);
  });

  it("PATCH with empty teamId detaches the user from the team", async () => {
    const admin = await createAdminUser();
    const { user } = await createUserWithTeam();
    mockSession(admin);

    const res = await PATCH(json({ teamId: "" }), params(user.id));
    expect(res.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.teamId).toBeNull();
  });

  it("PATCH with a nonexistent teamId returns 404", async () => {
    const admin = await createAdminUser();
    const user = await createUser();
    mockSession(admin);

    const res = await PATCH(json({ teamId: "nope" }), params(user.id));
    expect(res.status).toBe(404);
  });

  it("PATCH rejects a non-string name", async () => {
    const admin = await createAdminUser();
    const user = await createUser();
    mockSession(admin);

    const res = await PATCH(json({ name: 123 }), params(user.id));
    expect(res.status).toBe(400);
  });

  it("PATCH rejects an empty name", async () => {
    const admin = await createAdminUser();
    const user = await createUser();
    mockSession(admin);

    const res = await PATCH(json({ name: "" }), params(user.id));
    expect(res.status).toBe(400);
  });

  it("DELETE removes a user without history", async () => {
    const admin = await createAdminUser();
    const user = await createUser();
    mockSession(admin);

    const res = await DELETE(json({}, "DELETE"), params(user.id));
    expect(res.status).toBe(200);

    const gone = await prisma.user.findUnique({ where: { id: user.id } });
    expect(gone).toBeNull();
  });

  it("DELETE refuses to remove your own account", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await DELETE(json({}, "DELETE"), params(admin.id));
    expect(res.status).toBe(400);
  });

  it("DELETE a nonexistent user returns 404", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await DELETE(json({}, "DELETE"), params("nope"));
    expect(res.status).toBe(404);
  });

  it("DELETE a user with submissions succeeds", async () => {
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

    const res = await DELETE(json({}, "DELETE"), params(user.id));
    expect(res.status).toBe(200);
  });
});

describe("admin users POST", () => {
  const json = (body: unknown) =>
    new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const creds = {
    alias: `post_${Date.now().toString(36)}`,
    name: "POST Test",
    password: "secret123",
  };

  it("POST creates a user and honors teamId", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    mockSession(admin);

    const res = await POST(json({ ...creds, teamId: team.id }));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.user.teamId).toBe(team.id);
    expect(body.user.isTeamLeader).toBe(false);
  });

  it("POST creates a leader in a team without a leader", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    mockSession(admin);

    const res = await POST(json({ ...creds, teamId: team.id, isTeamLeader: true }));
    expect(res.status).toBe(201);
    expect((await res.json()).user.isTeamLeader).toBe(true);
  });

  it("POST rejects a leader with no team", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ ...creds, isTeamLeader: true }));
    expect(res.status).toBe(400);
  });

  it("POST rejects a second leader in the same team", async () => {
    const admin = await createAdminUser();
    const team = await createTeam();
    await createUser({ teamId: team.id, isTeamLeader: true });
    mockSession(admin);

    const res = await POST(json({ ...creds, teamId: team.id, isTeamLeader: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("leader");
  });

  it("POST rejects a nonexistent teamId", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ ...creds, teamId: "nope" }));
    expect(res.status).toBe(404);
  });
});
