vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { GET as getLogs } from "@/app/api/admin/logs/route";
import { GET as getSubmissions } from "@/app/api/admin/submissions/route";
import { prisma } from "../helpers/db";
import {
  createAdminUser,
  createUserWithTeam,
  createChallenge,
  mockSession,
} from "../helpers/factories";

describe("admin logs and submissions read views", () => {
  it("GET logs returns an empty list", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await getLogs();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.logs).toEqual([]);
  });

  it("GET logs includes the team relation", async () => {
    const admin = await createAdminUser();
    const { team } = await createUserWithTeam();
    mockSession(admin);

    await prisma.activityLog.create({
      data: { type: "TEST", description: "something", teamId: team.id },
    });

    const res = await getLogs();
    const body = await res.json();

    expect(body.logs).toHaveLength(1);
    expect(body.logs[0].team?.id).toBe(team.id);
  });

  it("GET submissions returns an empty list", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await getSubmissions();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.submissions).toEqual([]);
  });

  it("GET submissions includes user, team and challenge relations", async () => {
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

    const res = await getSubmissions();
    const body = await res.json();

    expect(body.submissions).toHaveLength(1);
    expect(body.submissions[0].user?.alias).toBe(user.alias);
    expect(body.submissions[0].team?.id).toBe(team.id);
    expect(body.submissions[0].challenge?.id).toBe(challenge.id);
  });
});
