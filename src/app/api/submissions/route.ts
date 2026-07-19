import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidate, CACHE_KEYS } from "@/lib/cache";
import { getGameWindowStatus } from "@/lib/game-window";
import { isChallengeUnlockedForTeam } from "@/lib/unlock";
import { createHash, timingSafeEqual } from "crypto";

const RATE_LIMIT_MS = 10_000;
const MAX_FLAG_LENGTH = 512;

// Constant-time string comparison — hashing first normalizes lengths so
// neither content nor length of the stored flag leaks through timing.
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.teamId) {
    return NextResponse.json(
      { error: "You must be in a team to submit flags" },
      { status: 400 }
    );
  }
  const teamId = session.user.teamId;

  // Game window enforcement — block before rate limit to save DB queries
  const gameStatus = await getGameWindowStatus();
  if (gameStatus.state === "not_started") {
    return NextResponse.json(
      { error: "The CTF hasn't started yet" },
      { status: 403 }
    );
  }
  if (gameStatus.state === "ended") {
    return NextResponse.json(
      { error: "The CTF has ended" },
      { status: 403 }
    );
  }

  // Rate limiting — DB-backed (works across serverless/multi-instance)
  const now = Date.now();
  const lastSub = await prisma.submission.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (lastSub && now - lastSub.createdAt.getTime() < RATE_LIMIT_MS) {
    const waitSec = Math.ceil(
      (RATE_LIMIT_MS - (now - lastSub.createdAt.getTime())) / 1000
    );
    return NextResponse.json(
      { error: `Rate limited. Wait ${waitSec}s before submitting again.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { challengeId, flag } = body;

    if (typeof challengeId !== "string" || typeof flag !== "string") {
      return NextResponse.json(
        { error: "challengeId and flag are required" },
        { status: 400 }
      );
    }

    const submittedFlag = flag.trim();
    if (!challengeId || !submittedFlag || submittedFlag.length > MAX_FLAG_LENGTH) {
      return NextResponse.json(
        { error: "challengeId and flag are required" },
        { status: 400 }
      );
    }

    // Fetch challenge
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { flags: true },
    });

    if (!challenge || !challenge.isActive) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Locked challenges accept submissions once the team meets the
    // unlock conditions — same rule the challenge listing applies.
    const unlocked = await isChallengeUnlockedForTeam(
      challenge.id,
      challenge.isLocked,
      teamId
    );
    if (!unlocked) {
      return NextResponse.json(
        { error: "Challenge is locked" },
        { status: 403 }
      );
    }

    // Check flag — multi-flag or single-flag mode
    let isCorrect = false;
    let matchedFlagId: string | null = null;
    let pointsAwarded = 0;

    if (challenge.multipleFlags && challenge.flags.length > 0) {
      const matchedFlag = challenge.flags.find((f) =>
        safeEqual(f.flag, submittedFlag)
      );
      if (matchedFlag) {
        isCorrect = true;
        matchedFlagId = matchedFlag.id;
        pointsAwarded = matchedFlag.points;
      }
    } else if (challenge.flag && safeEqual(challenge.flag, submittedFlag)) {
      isCorrect = true;
      pointsAwarded = challenge.points;
    }

    if (!isCorrect) {
      await prisma.submission.create({
        data: {
          flag: submittedFlag,
          isCorrect: false,
          userId: session.user.id,
          challengeId: challenge.id,
          flagId: null,
          teamId,
        },
      });
      return NextResponse.json({
        correct: false,
        message: "Incorrect flag",
      });
    }

    // Correct flag: the duplicate check and every scoring write run in one
    // serializable transaction so two concurrent submissions can't both
    // pass the "already solved" check and double-award points.
    const result = await prisma.$transaction(
      async (tx) => {
        const alreadySolved = await tx.submission.findFirst({
          where: matchedFlagId
            ? { teamId, flagId: matchedFlagId, isCorrect: true }
            : { teamId, challengeId: challenge.id, isCorrect: true },
        });

        if (alreadySolved) {
          return { alreadySubmitted: true as const };
        }

        await tx.submission.create({
          data: {
            flag: submittedFlag,
            isCorrect: true,
            userId: session.user.id,
            challengeId: challenge.id,
            flagId: matchedFlagId,
            teamId,
          },
        });

        await tx.score.create({
          data: {
            points: pointsAwarded,
            userId: session.user.id,
            teamId,
            challengeId: challenge.id,
          },
        });

        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: { score: { increment: pointsAwarded } },
        });

        await tx.teamPointHistory.create({
          data: {
            teamId,
            points: pointsAwarded,
            totalPoints: updatedTeam.score,
            reason: "CHALLENGE_SOLVE",
            metadata: JSON.stringify({
              challengeId: challenge.id,
              challengeTitle: challenge.title,
              flagId: matchedFlagId,
            }),
          },
        });

        await tx.activityLog.create({
          data: {
            type: "CHALLENGE_SOLVE",
            description: `solved "${challenge.title}"`,
            teamId,
          },
        });

        return { alreadySubmitted: false as const };
      },
      { isolationLevel: "Serializable" }
    );

    if (result.alreadySubmitted) {
      return NextResponse.json({
        correct: true,
        alreadySubmitted: true,
        message: matchedFlagId
          ? "Flag already submitted"
          : "Challenge already solved",
      });
    }

    // Invalidate caches — scores and solve counts changed
    invalidate(CACHE_KEYS.LEADERBOARD);
    invalidate(CACHE_KEYS.CHALLENGES);

    return NextResponse.json({
      correct: true,
      alreadySubmitted: false,
      points: pointsAwarded,
      message: challenge.solveExplanation || "Correct!",
    });
  } catch (error: unknown) {
    // Serialization conflict — concurrent solve attempt; client can retry
    if ((error as { code?: string }).code === "P2034") {
      return NextResponse.json(
        { error: "Please try again" },
        { status: 409 }
      );
    }
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
