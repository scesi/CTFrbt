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
      const teams = await prisma.team.findMany({
        orderBy: { score: "desc" },
        include: {
          members: {
            select: { id: true, alias: true, name: true },
          },
          _count: {
            select: {
              submissions: { where: { isCorrect: true } },
            },
          },
        },
      });

      return teams.map((team, index) => ({
        rank: index + 1,
        id: team.id,
        name: team.name,
        score: team.score,
        icon: team.icon,
        color: team.color,
        memberCount: team.members.length,
        solveCount: team._count.submissions,
      }));
    },
  );

  let currentUserTeam = null;
  if (session?.user?.teamId) {
    currentUserTeam = rankedTeams.find((t) => t.id === session.user.teamId) || null;
  }

  return NextResponse.json({ teams: rankedTeams, currentUserTeam });
}
