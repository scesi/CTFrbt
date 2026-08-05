vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/submissions/route";
import { RATE_LIMIT_MS } from "@/lib/rate-limit";
import { prisma } from "../helpers/db";
import { getServerSession } from "next-auth";

import {
  createChallenge,
  createMultiFlagChallenge,
  createUserWithTeam,
  setGameConfig,
} from "../helpers/factories";

describe("POST /api/submissions", () => {
  it("creates score for a correct single flag", async () => {
    const { user, team } = await createUserWithTeam();
    const challenge = await createChallenge();

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: user.id,
        teamId: team.id,
        isAdmin: false,
      },
    } as Awaited<ReturnType<typeof getServerSession>>);

    await setGameConfig(
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const request = new Request("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({
        challengeId: challenge.id,
        flag: challenge.flag,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.correct).toBe(true);

    const score = await prisma.score.findFirst({
      where: {
        teamId: team.id,
        challengeId: challenge.id,
      },
    });

    expect(score).not.toBeNull();
    expect(score?.points).toBe(challenge.points);
    expect(score?.userId).toBe(user.id);
    expect(score?.teamId).toBe(team.id);
    expect(score?.challengeId).toBe(challenge.id);

    const history = await prisma.teamPointHistory.findFirst({
      where: {
        teamId: team.id,
        reason: "CHALLENGE_SOLVE",
      },
    });

    expect(history).not.toBeNull();
    expect(history?.points).toBe(challenge.points);
    expect(history?.totalPoints).toBe(challenge.points);
    expect(history?.reason).toBe("CHALLENGE_SOLVE");

    const activity = await prisma.activityLog.findFirst({
      where: {
        teamId: team.id,
        type: "CHALLENGE_SOLVE",
      },
    });

    expect(activity).not.toBeNull();
    expect(activity?.type).toBe("CHALLENGE_SOLVE");
    expect(activity?.description).toBe(`solved "${challenge.title}"`);

    const updatedTeam = await prisma.team.findUnique({
      where: {
        id: team.id,
      },
    });

    expect(updatedTeam?.score).toBe(challenge.points);
  });

  it("does not award points twice for the same flag", async () => {
    const { user, team } = await createUserWithTeam();
    const challenge = await createChallenge();

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: user.id,
        teamId: team.id,
        isAdmin: false,
      },
    } as Awaited<ReturnType<typeof getServerSession>>);

    await setGameConfig(
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const createRequest = () =>
      new Request("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          challengeId: challenge.id,
          flag: challenge.flag,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

    const firstResponse = await POST(createRequest());

    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.correct).toBe(true);

    // Wait for rate limit window
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS, +100));

    const secondResponse = await POST(createRequest());

    const secondBody = await secondResponse.json();

    expect(secondBody.alreadySubmitted).toBe(true);

    const scores = await prisma.score.findMany({
      where: {
        teamId: team.id,
        challengeId: challenge.id,
      },
    });

    expect(scores).toHaveLength(1);
    expect(scores[0].points).toBe(challenge.points);

    const updatedTeam = await prisma.team.findUnique({
      where: {
        id: team.id,
      },
    });

    expect(updatedTeam?.score).toBe(challenge.points);
  }, 15000);

  it("multi-flag: each flag awards points only once per team", async () => {
    const { user, team } = await createUserWithTeam();

    const challenge = await createMultiFlagChallenge([
      { flag: "flag{a}", points: 25 },
      { flag: "flag{b}", points: 50 },
    ]);

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: user.id,
        teamId: team.id,
        isAdmin: false,
      },
    } as Awaited<ReturnType<typeof getServerSession>>);

    await setGameConfig(
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const createRequest = (flag: string) =>
      new Request("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          challengeId: challenge.id,
          flag,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

    // Submit first flag
    const responseA = await POST(createRequest("flag{a}"));

    const bodyA = await responseA.json();

    expect(responseA.status).toBe(200);
    expect(bodyA.correct).toBe(true);
    expect(bodyA.points).toBe(25);

    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS + 100));

    // Submit second flag
    const responseB = await POST(createRequest("flag{b}"));

    const bodyB = await responseB.json();

    expect(responseB.status).toBe(200);
    expect(bodyB.correct).toBe(true);
    expect(bodyB.points).toBe(50);

    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS + 100));

    // Submit first flag again
    const responseAgain = await POST(createRequest("flag{a}"));

    const bodyAgain = await responseAgain.json();

    expect(bodyAgain.alreadySubmitted).toBe(true);

    // Verify only two rewards exist
    const scores = await prisma.score.findMany({
      where: {
        teamId: team.id,
        challengeId: challenge.id,
      },
    });

    expect(scores).toHaveLength(2);

    // Verify total team score
    const updatedTeam = await prisma.team.findUnique({
      where: {
        id: team.id,
      },
    });

    expect(updatedTeam?.score).toBe(75);
  }, 30000);

  it("handles concurrent submissions without double scoring", async () => {
    const { user, team } = await createUserWithTeam();
    const challenge = await createChallenge();

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: user.id,
        teamId: team.id,
        isAdmin: false,
      },
    } as Awaited<ReturnType<typeof getServerSession>>);

    await setGameConfig(
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const createRequest = () =>
      new Request("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          challengeId: challenge.id,
          flag: challenge.flag,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

    // Send both submissions at the same time
    await Promise.all([POST(createRequest()), POST(createRequest())]);

    // Only one score should exist
    const scoreCount = await prisma.score.count({
      where: {
        teamId: team.id,
        challengeId: challenge.id,
      },
    });

    expect(scoreCount).toBe(1);

    // Team score should only contain one reward
    const updatedTeam = await prisma.team.findUnique({
      where: {
        id: team.id,
      },
    });

    expect(updatedTeam?.score).toBe(challenge.points);
  }, 15000);

  it("multi-flag: concurrent submissions of the same sub-flag award points once", async () => {
    const { user, team } = await createUserWithTeam();

    const challenge = await createMultiFlagChallenge([
      { flag: "flag{a}", points: 25 },
      { flag: "flag{b}", points: 50 },
    ]);

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: user.id,
        teamId: team.id,
        isAdmin: false,
      },
    } as Awaited<ReturnType<typeof getServerSession>>);

    await setGameConfig(
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const createRequest = () =>
      new Request("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          challengeId: challenge.id,
          flag: "flag{a}",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

    // Submit the same sub-flag at the same time
    const [response1, response2] = await Promise.all([
      POST(createRequest()),
      POST(createRequest()),
    ]);

    const body1 = await response1.json();
    const body2 = await response2.json();

    // One request should succeed
    expect(body1.correct || body2.correct).toBe(true);

    // Only one score should be created
    const scores = await prisma.score.findMany({
      where: {
        teamId: team.id,
        challengeId: challenge.id,
      },
    });

    expect(scores).toHaveLength(1);
    expect(scores[0].points).toBe(25);

    // Only one history entry should exist
    const history = await prisma.teamPointHistory.findMany({
      where: {
        teamId: team.id,
        reason: "CHALLENGE_SOLVE",
      },
    });

    expect(history).toHaveLength(1);
    expect(history[0].points).toBe(25);

    // Team score should only increase once
    const updatedTeam = await prisma.team.findUnique({
      where: {
        id: team.id,
      },
    });

    expect(updatedTeam?.score).toBe(25);
  });

  it("Incorrect flag: creates failed submission without score", async () => {
    const { user, team } = await createUserWithTeam();
    const challenge = await createChallenge();

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: user.id,
        teamId: team.id,
        isAdmin: false,
      },
    } as Awaited<ReturnType<typeof getServerSession>>);

    await setGameConfig(
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const request = new Request("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({
        challengeId: challenge.id,
        flag: "flag{wrong}",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.correct).toBe(false);

    const submission = await prisma.submission.findFirst({
      where: {
        teamId: team.id,
        challengeId: challenge.id,
      },
    });

    expect(submission).not.toBeNull();
    expect(submission?.isCorrect).toBe(false);

    const score = await prisma.score.findFirst({
      where: {
        teamId: team.id,
        challengeId: challenge.id,
      },
    });

    expect(score).toBeNull();

    const updatedTeam = await prisma.team.findUnique({
      where: {
        id: team.id,
      },
    });

    expect(updatedTeam?.score).toBe(0);
  });
});
