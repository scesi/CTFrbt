import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSet, CACHE_KEYS } from "@/lib/cache";
import { getGameWindowStatus } from "@/lib/game-window";

const CHALLENGES_TTL_MS = 15_000; // 15 seconds

// GET /api/challenges — List all challenges grouped by category
export async function GET() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.isAdmin === true;

  // Game window enforcement — admins always see full content
  const gameStatus = await getGameWindowStatus();
  if (gameStatus.state === "not_started" && !isAdmin) {
    return NextResponse.json({
      categories: [],
      challengesByCategory: {},
      gameStatus: { state: "not_started", startsAt: gameStatus.startsAt },
    });
  }

  // Cache the expensive challenge query (shared across all users)
  const challenges = await getOrSet(
    CACHE_KEYS.CHALLENGES,
    CHALLENGES_TTL_MS,
    async () => {
      return prisma.challenge.findMany({
        where: { isActive: true },
        include: {
          files: {
            select: { id: true, name: true, size: true },
          },
          hints: {
            select: { id: true, cost: true },
          },
          flags: {
            select: { id: true, points: true },
          },
          _count: {
            select: { submissions: { where: { isCorrect: true } } },
          },
        },
        orderBy: [{ category: "asc" }, { points: "asc" }],
      });
    },
  );

  // Per-user data — NOT cached (cheap queries, user-specific)
  let solvedChallengeIds: string[] = [];
  let solvedFlagIds: string[] = [];

  if (session?.user?.teamId) {
    const solvedSubmissions = await prisma.submission.findMany({
      where: {
        teamId: session.user.teamId,
        isCorrect: true,
      },
      select: { challengeId: true, flagId: true },
    });
    solvedChallengeIds = [
      ...new Set(solvedSubmissions.map((s) => s.challengeId)),
    ];
    solvedFlagIds = solvedSubmissions
      .filter((s) => s.flagId)
      .map((s) => s.flagId!);
  }

  // Check unlock conditions for locked challenges
  const enrichedChallenges = await Promise.all(
    challenges.map(async (challenge) => {
      let isLocked = challenge.isLocked;

      if (isLocked && session?.user?.teamId) {
        const conditions = await prisma.unlockCondition.findMany({
          where: { challengeId: challenge.id },
        });

        // Check if all conditions are met
        const allMet = conditions.every((condition) => {
          if (condition.type === "CHALLENGE_SOLVED" && condition.requiredChallengeId) {
            return solvedChallengeIds.includes(condition.requiredChallengeId);
          }
          return false;
        });

        if (allMet && conditions.length > 0) {
          isLocked = false;
        }
      }

      return {
        id: challenge.id,
        title: challenge.title,
        description: isLocked ? "" : challenge.description,
        points: challenge.points,
        category: challenge.category,
        difficulty: challenge.difficulty,
        isLocked,
        isSolved: solvedChallengeIds.includes(challenge.id),
        solveCount: challenge._count.submissions,
        multipleFlags: challenge.multipleFlags,
        link: isLocked ? null : challenge.link,
        files: isLocked ? [] : challenge.files,
        hintCount: challenge.hints.length,
        flags: challenge.multipleFlags
          ? challenge.flags.map((f) => ({
              id: f.id,
              points: f.points,
              isSolved: solvedFlagIds.includes(f.id),
            }))
          : [],
      };
    })
  );

  // Group by category
  const categories: Record<string, typeof enrichedChallenges> = {};
  for (const challenge of enrichedChallenges) {
    if (!categories[challenge.category]) {
      categories[challenge.category] = [];
    }
    categories[challenge.category].push(challenge);
  }

  return NextResponse.json({
    categories: Object.keys(categories),
    challengesByCategory: categories,
    gameStatus: { state: gameStatus.state },
  });
}
