import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/leaderboard — Get team rankings
export async function GET() {
  const session = await getServerSession(authOptions);

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

  const rankedTeams = teams.map((team, index) => ({
    rank: index + 1,
    id: team.id,
    name: team.name,
    score: team.score,
    icon: team.icon,
    color: team.color,
    memberCount: team.members.length,
    solveCount: team._count.submissions,
  }));

  let currentUserTeam = null;
  if (session?.user?.teamId) {
    currentUserTeam = rankedTeams.find((t) => t.id === session.user.teamId) || null;
  }

  return NextResponse.json({ teams: rankedTeams, currentUserTeam });
}
