import { prisma } from "@/lib/prisma";
import type { UnlockCondition } from "../../prisma/generated/client";

/**
 * Evaluates whether a set of unlock conditions is satisfied given the
 * challenge ids a team has already solved. A locked challenge with no
 * conditions can never be unlocked by players.
 */
export function areConditionsMet(
  conditions: UnlockCondition[],
  solvedChallengeIds: ReadonlySet<string>,
): boolean {
  if (conditions.length === 0) return false;
  return conditions.every((condition) =>
    condition.type === "CHALLENGE_SOLVED" && condition.requiredChallengeId
      ? solvedChallengeIds.has(condition.requiredChallengeId)
      : false,
  );
}

/**
 * Resolves whether a locked challenge is effectively unlocked for a team.
 * Returns true immediately if the challenge is not locked.
 */
export async function isChallengeUnlockedForTeam(
  challengeId: string,
  isLocked: boolean,
  teamId: string | null | undefined,
): Promise<boolean> {
  if (!isLocked) return true;
  if (!teamId) return false;

  const [conditions, solvedSubmissions] = await Promise.all([
    prisma.unlockCondition.findMany({ where: { challengeId } }),
    prisma.submission.findMany({
      where: { teamId, isCorrect: true },
      select: { challengeId: true },
    }),
  ]);

  const solvedIds = new Set(solvedSubmissions.map((s) => s.challengeId));
  return areConditionsMet(conditions, solvedIds);
}
