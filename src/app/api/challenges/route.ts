import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSet, CACHE_KEYS } from "@/lib/cache";
import { getGameWindowStatus } from "@/lib/game-window";
import { areConditionsMet } from "@/lib/unlock";
import type { UnlockCondition } from "../../../../prisma/generated/client";

const CHALLENGES_TTL_MS = 15_000; // 15 seconds

// GET /api/challenges — List all challenges grouped by category.
// Auth required: challenge content is for registered players only.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = session.user.isAdmin === true;

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
  const { challenges, solveCounts } = await getOrSet(
    CACHE_KEYS.CHALLENGES,
    CHALLENGES_TTL_MS,
    async () => {
      const [challenges, correctSubs] = await Promise.all([
        prisma.challenge.findMany({
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
          },
          orderBy: [{ category: "asc" }, { points: "asc" }],
        }),
        prisma.submission.findMany({
          where: { isCorrect: true },
          select: { challengeId: true, teamId: true, flagId: true },
        }),
      ]);

      // Solve count = teams that fully solved the challenge. Counting raw
      // correct submissions would inflate multi-flag challenges (one per flag).
      const capturedFlags = new Map<string, Map<string, Set<string>>>();
      for (const sub of correctSubs) {
        let teams = capturedFlags.get(sub.challengeId);
        if (!teams) {
          teams = new Map();
          capturedFlags.set(sub.challengeId, teams);
        }
        let flags = teams.get(sub.teamId);
        if (!flags) {
          flags = new Set();
          teams.set(sub.teamId, flags);
        }
        if (sub.flagId) flags.add(sub.flagId);
      }

      const solveCounts: Record<string, number> = {};
      for (const challenge of challenges) {
        const teams = capturedFlags.get(challenge.id);
        if (!teams) {
          solveCounts[challenge.id] = 0;
        } else if (challenge.multipleFlags) {
          let solved = 0;
          for (const flags of teams.values()) {
            if (
              challenge.flags.length > 0 &&
              flags.size >= challenge.flags.length
            ) {
              solved++;
            }
          }
          solveCounts[challenge.id] = solved;
        } else {
          solveCounts[challenge.id] = teams.size;
        }
      }

      return { challenges, solveCounts };
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

  // Check unlock conditions for locked challenges.
  // One batched query for all locked challenges instead of one per challenge.
  const lockedIds = challenges.filter((c) => c.isLocked).map((c) => c.id);
  const conditionsByChallenge = new Map<string, UnlockCondition[]>();

  if (lockedIds.length > 0 && session?.user?.teamId) {
    const allConditions = await prisma.unlockCondition.findMany({
      where: { challengeId: { in: lockedIds } },
    });
    for (const condition of allConditions) {
      const list = conditionsByChallenge.get(condition.challengeId) ?? [];
      list.push(condition);
      conditionsByChallenge.set(condition.challengeId, list);
    }
  }

  const solvedIdSet = new Set(solvedChallengeIds);

  const enrichedChallenges = challenges.map((challenge) => {
    let isLocked = challenge.isLocked;

    if (isLocked && session?.user?.teamId) {
      const conditions = conditionsByChallenge.get(challenge.id) ?? [];
      if (areConditionsMet(conditions, solvedIdSet)) {
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
      isSolved: solvedIdSet.has(challenge.id),
      solveCount: solveCounts[challenge.id] ?? 0,
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
  });

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
