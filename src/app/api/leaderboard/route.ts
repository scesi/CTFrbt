import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrSet, CACHE_KEYS } from "@/lib/cache";

const LEADERBOARD_TTL_MS = 10_000; // 10 seconds

// GET /api/leaderboard — Get team rankings
export async function GET() {
  const session = await getServerSession(authOptions);

  const rankedTeams = await getOrSet(
    CACHE_KEYS.LEADERBOARD,
    LEADERBOARD_TTL_MS,
    async () => {
      const [teams, correctSubs, multiFlagChallenges] = await Promise.all([
        prisma.team.findMany({
          orderBy: { score: "desc" },
          include: {
            _count: { select: { members: true } },
          },
        }),
        prisma.submission.findMany({
          where: { isCorrect: true },
          select: { teamId: true, challengeId: true, flagId: true },
        }),
        prisma.challenge.findMany({
          where: { multipleFlags: true },
          select: { id: true, _count: { select: { flags: true } } },
        }),
      ]);

      // Solve count = challenges fully solved (all flags for multi-flag),
      // not raw correct submissions.
      const requiredFlags = new Map(
        multiFlagChallenges.map((c) => [c.id, c._count.flags]),
      );

      const capturedByTeam = new Map<string, Map<string, Set<string>>>();
      for (const sub of correctSubs) {
        let challenges = capturedByTeam.get(sub.teamId);
        if (!challenges) {
          challenges = new Map();
          capturedByTeam.set(sub.teamId, challenges);
        }
        let flags = challenges.get(sub.challengeId);
        if (!flags) {
          flags = new Set();
          challenges.set(sub.challengeId, flags);
        }
        if (sub.flagId) flags.add(sub.flagId);
      }

      const solveCountByTeam = new Map<string, number>();
      for (const [teamId, challenges] of capturedByTeam) {
        let solved = 0;
        for (const [challengeId, flags] of challenges) {
          const required = requiredFlags.get(challengeId);
          if (required === undefined) {
            solved++; // single-flag: any correct submission solves it
          } else if (required > 0 && flags.size >= required) {
            solved++;
          }
        }
        solveCountByTeam.set(teamId, solved);
      }

      return teams.map((team, index) => ({
        rank: index + 1,
        id: team.id,
        name: team.name,
        score: team.score,
        icon: team.icon,
        color: team.color,
        memberCount: team._count.members,
        solveCount: solveCountByTeam.get(team.id) ?? 0,
      }));
    },
  );

  let currentUserTeam = null;
  if (session?.user?.teamId) {
    currentUserTeam =
      rankedTeams.find((t) => t.id === session.user.teamId) || null;
  }

  return NextResponse.json({ teams: rankedTeams, currentUserTeam });
}
