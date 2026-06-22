import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_MS = 10_000;

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

    if (!challengeId || !flag) {
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

    if (challenge.isLocked) {
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
      // Multi-flag: check against ChallengeFlag entries
      const matchedFlag = challenge.flags.find(
        (f) => f.flag === flag.trim()
      );

      if (matchedFlag) {
        // Check if this specific flag was already submitted by the team
        const alreadySubmitted = await prisma.submission.findFirst({
          where: {
            teamId: session.user.teamId,
            flagId: matchedFlag.id,
            isCorrect: true,
          },
        });

        if (alreadySubmitted) {
          return NextResponse.json({
            correct: true,
            alreadySubmitted: true,
            message: "Flag already submitted",
          });
        }

        isCorrect = true;
        matchedFlagId = matchedFlag.id;
        pointsAwarded = matchedFlag.points;
      }
    } else {
      // Single flag mode
      if (challenge.flag && challenge.flag === flag.trim()) {
        // Check if already solved by team
        const alreadySolved = await prisma.submission.findFirst({
          where: {
            teamId: session.user.teamId,
            challengeId: challenge.id,
            isCorrect: true,
          },
        });

        if (alreadySolved) {
          return NextResponse.json({
            correct: true,
            alreadySubmitted: true,
            message: "Challenge already solved",
          });
        }

        isCorrect = true;
        pointsAwarded = challenge.points;
      }
    }

    // Record submission
    await prisma.submission.create({
      data: {
        flag: flag.trim(),
        isCorrect,
        userId: session.user.id,
        challengeId: challenge.id,
        flagId: matchedFlagId,
        teamId: session.user.teamId,
      },
    });

    if (isCorrect) {
      // Award points
      await prisma.score.create({
        data: {
          points: pointsAwarded,
          userId: session.user.id,
          teamId: session.user.teamId,
          challengeId: challenge.id,
        },
      });

      // Update team total score
      const updatedTeam = await prisma.team.update({
        where: { id: session.user.teamId },
        data: { score: { increment: pointsAwarded } },
      });

      // Record point history
      await prisma.teamPointHistory.create({
        data: {
          teamId: session.user.teamId,
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

      // Log activity
      await prisma.activityLog.create({
        data: {
          type: "CHALLENGE_SOLVE",
          description: `solved "${challenge.title}"`,
          teamId: session.user.teamId,
        },
      });

      return NextResponse.json({
        correct: true,
        alreadySubmitted: false,
        points: pointsAwarded,
        message: challenge.solveExplanation || "Correct!",
      });
    }

    return NextResponse.json({
      correct: false,
      message: "Incorrect flag",
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
