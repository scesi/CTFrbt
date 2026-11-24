vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { describe, expect, it, vi, afterEach } from "vitest";
import { PATCH, POST as saveConfig } from "@/app/api/admin/game/route";
import { POST as submit } from "@/app/api/submissions/route";
import { GET as challenges } from "@/app/api/challenges/route";
import { GET as hints, POST as buyHint } from "@/app/api/hints/route";
import { GET as files } from "@/app/api/files/[fileId]/route";
import { GET as legacyDownload } from "@/app/api/downloads/[...path]/route";
import { GET as leaderboard } from "@/app/api/leaderboard/route";
import { GET as announcements } from "@/app/api/announcements/route";
import { GET as rules } from "@/app/api/rules/route";
import { GET as notifications } from "@/app/api/notifications/route";
import { GET as teams } from "@/app/api/teams/route";
import { GET as game } from "@/app/api/game/route";
import { getGameWindowStatus } from "@/lib/game-window";
import { assertEventNotPaused, EventPausedError } from "@/lib/event-pause";
import { CACHE_KEYS, invalidate } from "@/lib/cache";
import { prisma } from "../helpers/db";
import {
  createAdminUser,
  createUserWithTeam,
  createChallenge,
  createHint,
  mockSession,
  mockNoSession,
  setGameConfig,
} from "../helpers/factories";

afterEach(() => {
  Object.values(CACHE_KEYS).forEach(invalidate);
  vi.useRealTimers();
});
const request = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
async function active() {
  return setGameConfig(
    new Date(Date.now() - 60_000),
    new Date(Date.now() + 3 * 3600_000),
  );
}
async function pause() {
  const config = await active();
  await prisma.gameConfig.update({
    where: { id: config.id },
    data: { pausedUntil: new Date(Date.now() + 3600_000) },
  });
  return config;
}

describe("event pause", () => {
  it("requires an administrator for both actions", async () => {
    mockNoSession();
    expect(
      (await PATCH(request({ action: "pause", minutes: 60 }))).status,
    ).toBe(403);
    mockSession((await createUserWithTeam()).user);
    expect((await PATCH(request({ action: "resume" }))).status).toBe(403);
  });

  it("validates duration and requires an active configured event", async () => {
    mockSession(await createAdminUser());
    for (const minutes of [0, -1, 1441, 1.5, "60", null]) {
      expect((await PATCH(request({ action: "pause", minutes }))).status).toBe(
        400,
      );
    }
    expect(
      (await PATCH(request({ action: "pause", minutes: 60 }))).status,
    ).toBe(409);
    await setGameConfig(new Date(Date.now() + 60_000));
    expect(
      (await PATCH(request({ action: "pause", minutes: 60 }))).status,
    ).toBe(409);
  });

  it("persists pause, caps it at endTime, and resumes without changing the schedule", async () => {
    const config = await active();
    mockSession(await createAdminUser());
    const response = await PATCH(request({ action: "pause", minutes: 240 }));
    expect(response.status).toBe(200);
    expect((await response.json()).config.pausedUntil).toBe(
      config.endTime!.toISOString(),
    );
    expect((await getGameWindowStatus()).state).toBe("paused");
    const state = await (await game()).json();
    expect(state.gameConfig.pausedUntil).toBe(config.endTime!.toISOString());
    expect(state.serverNow).toBeTruthy();
    expect((await PATCH(request({ action: "resume" }))).status).toBe(200);
    expect((await getGameWindowStatus()).state).toBe("active");
    expect(
      (await prisma.gameConfig.findUniqueOrThrow({ where: { id: config.id } }))
        .endTime,
    ).toEqual(config.endTime);
    expect(await prisma.activityLog.count()).toBe(2);
  });

  it("adjusts the existing deadline atomically, preserving concurrent adjustments", async () => {
    const config = await pause();
    mockSession(await createAdminUser());
    const before = await prisma.gameConfig.findUniqueOrThrow({
      where: { id: config.id },
    });
    const responses = await Promise.all([
      PATCH(request({ action: "adjust", minutes: 5 })),
      PATCH(request({ action: "adjust", minutes: 5 })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    const after = await prisma.gameConfig.findUniqueOrThrow({
      where: { id: config.id },
    });
    expect(after.pausedUntil!.getTime()).toBe(
      before.pausedUntil!.getTime() + 600_000,
    );
    const reduced = await PATCH(request({ action: "adjust", minutes: -5 }));
    expect(reduced.status).toBe(200);
    expect(Date.parse((await reduced.json()).config.pausedUntil)).toBe(
      before.pausedUntil!.getTime() + 300_000,
    );
    expect(after.endTime).toEqual(before.endTime);
    expect(
      await prisma.activityLog.count({
        where: { type: "EVENT_PAUSE_ADJUSTED" },
      }),
    ).toBe(3);
  });

  it("validates adjustments, enforces admin access and requires an ongoing pause", async () => {
    await active();
    mockSession((await createUserWithTeam()).user);
    expect(
      (await PATCH(request({ action: "adjust", minutes: 5 }))).status,
    ).toBe(403);
    mockSession(await createAdminUser());
    for (const minutes of [0, 10, -10, "5", null]) {
      expect((await PATCH(request({ action: "adjust", minutes }))).status).toBe(
        400,
      );
    }
    expect(
      (await PATCH(request({ action: "adjust", minutes: 5 }))).status,
    ).toBe(409);
  });

  it("caps extensions at the event end and rejects shortening past now or adjusting expired pauses", async () => {
    const config = await active();
    mockSession(await createAdminUser());
    await prisma.gameConfig.update({
      where: { id: config.id },
      data: { pausedUntil: new Date(config.endTime!.getTime() - 60_000) },
    });
    const extended = await PATCH(request({ action: "adjust", minutes: 5 }));
    expect((await extended.json()).config.pausedUntil).toBe(
      config.endTime!.toISOString(),
    );
    const deadline = new Date(Date.now() + 120_000);
    await prisma.gameConfig.update({
      where: { id: config.id },
      data: { pausedUntil: deadline },
    });
    expect(
      (await PATCH(request({ action: "adjust", minutes: -5 }))).status,
    ).toBe(409);
    expect(
      (await prisma.gameConfig.findUniqueOrThrow({ where: { id: config.id } }))
        .pausedUntil,
    ).toEqual(deadline);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(deadline);
    expect(
      (await PATCH(request({ action: "adjust", minutes: 5 }))).status,
    ).toBe(409);
  });

  it("blocks flags, purchases and every event content route without writes", async () => {
    await pause();
    const { user, team } = await createUserWithTeam();
    const challenge = await createChallenge();
    const hint = await createHint(challenge.id);
    const file = await prisma.challengeFile.create({
      data: {
        challengeId: challenge.id,
        name: "proof.txt",
        path: "uploads/proof.txt",
        size: 1,
      },
    });
    mockSession(user);
    const responses = await Promise.all([
      submit(request({ challengeId: challenge.id, flag: "flag{test}" })),
      submit(request({ challengeId: challenge.id, flag: "wrong" })),
      buyHint(request({ hintId: hint.id })),
      challenges(),
      hints(
        new Request(`http://localhost/api/hints?challengeId=${challenge.id}`),
      ),
      files(new Request("http://localhost"), {
        params: Promise.resolve({ fileId: file.id }),
      }),
      legacyDownload(new Request("http://localhost/uploads/proof.txt"), {
        params: Promise.resolve({ path: ["proof.txt"] }),
      }),
      leaderboard(),
      announcements(),
      rules(),
      notifications(),
      teams(),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(403);
      expect((await response.json()).code).toBe("EVENT_PAUSED");
    }
    expect(await prisma.submission.count()).toBe(0);
    expect(await prisma.score.count()).toBe(0);
    expect(await prisma.teamHint.count()).toBe(0);
    expect(
      (await prisma.team.findUniqueOrThrow({ where: { id: team.id } })).score,
    ).toBe(0);
  });

  it("keeps admin content visible but never awards points during pause", async () => {
    await pause();
    mockSession((await createUserWithTeam({ isAdmin: true })).user);
    expect((await challenges()).status).toBe(200);
    expect(
      (await submit(request({ challengeId: "any", flag: "flag{x}" }))).status,
    ).toBe(403);
  });

  it("resumes at the exact deadline with no background job", async () => {
    const config = await pause();
    const deadline = new Date(Date.now() + 30_000);
    await prisma.gameConfig.update({
      where: { id: config.id },
      data: { pausedUntil: deadline },
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(deadline.getTime() - 1);
    expect((await getGameWindowStatus()).state).toBe("paused");
    vi.setSystemTime(deadline);
    expect((await getGameWindowStatus()).state).toBe("active");
  });

  it("schedule edits preserve pause; resumed solves and hints are not duplicated", async () => {
    const config = await pause();
    mockSession(await createAdminUser());
    await saveConfig(
      request({ startTime: config.startTime, endTime: config.endTime }),
    );
    expect((await getGameWindowStatus()).state).toBe("paused");
    await PATCH(request({ action: "resume" }));
    const { user, team } = await createUserWithTeam();
    const challenge = await createChallenge();
    const hint = await createHint(challenge.id, { cost: 10 });
    mockSession(user);
    expect(
      (await submit(request({ challengeId: challenge.id, flag: "flag{test}" })))
        .status,
    ).toBe(200);
    expect((await buyHint(request({ hintId: hint.id }))).status).toBe(200);
    expect((await buyHint(request({ hintId: hint.id }))).status).toBe(200);
    expect(
      (await prisma.team.findUniqueOrThrow({ where: { id: team.id } })).score,
    ).toBe(90);
    expect(await prisma.score.count()).toBe(1);
    expect(await prisma.teamHint.count()).toBe(1);
  });

  it("rechecks state inside the scoring transaction", async () => {
    await pause();
    await expect(
      prisma.$transaction((tx) => assertEventNotPaused(tx)),
    ).rejects.toBeInstanceOf(EventPausedError);
  });

  it("pause confirmation waits for an already admitted scoring transaction", async () => {
    await active();
    mockSession(await createAdminUser());
    let release!: () => void;
    let admitted!: () => void;
    const admission = new Promise<void>((resolve) => {
      admitted = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const work = prisma.$transaction(async (tx) => {
      await assertEventNotPaused(tx);
      admitted();
      await hold;
    });
    await admission;
    let completed = false;
    const pausing = PATCH(request({ action: "pause", minutes: 60 })).then(
      (result) => {
        completed = true;
        return result;
      },
    );
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(completed).toBe(false);
    } finally {
      release();
    }
    await work;
    expect((await pausing).status).toBe(200);
    await expect(
      prisma.$transaction((tx) => assertEventNotPaused(tx)),
    ).rejects.toBeInstanceOf(EventPausedError);
  });
});
