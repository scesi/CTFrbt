import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/export - Export all data
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [challenges, users, teams, announcements, gameConfig] =
      await Promise.all([
        prisma.challenge.findMany({
          select: {
            id: true,
            title: true,
            description: true,
            points: true,
            category: true,
            difficulty: true,
            isActive: true,
            isLocked: true,
            link: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.findMany({
          select: {
            id: true,
            alias: true,
            name: true,
            password: true,
            isAdmin: true,
            isTeamLeader: true,
            teamId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.team.findMany({
          select: {
            id: true,
            name: true,
            code: true,
            score: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.announcement.findMany({
          select: {
            id: true,
            title: true,
            content: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.gameConfig.findFirst({
          select: {
            startTime: true,
            endTime: true,
          },
        }),
      ]);

    return NextResponse.json({
      challenges,
      users,
      teams,
      announcements,
      gameConfig,
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/admin/export - Import data
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { challenges, users, teams, announcements, gameConfig } = body;

    // Validate input
    if (!challenges && !users && !teams && !announcements && !gameConfig) {
      return NextResponse.json(
        { error: "No data provided for import" },
        { status: 400 },
      );
    }

    if (
      Array.isArray(users) &&
      users.some(
        (u: Record<string, unknown>) =>
          typeof u.password !== "string" || u.password.length === 0,
      )
    ) {
      return NextResponse.json(
        { error: "All users must include a password hash" },
        { status: 400 },
      );
    }

    // Begin transaction for all-or-nothing import
    const result = await prisma.$transaction(async (tx) => {
      const imported: Record<string, unknown> = {};

      if (teams) {
        // Delete existing teams first (will cascade to users)
        await tx.team.deleteMany({});
        imported.teams = await Promise.all(
          teams.map((team: Record<string, unknown>) =>
            tx.team.create({
              data: {
                name: team.name as string,
                code: team.code as string,
                score: (team.score as number) || 0,
              },
            }),
          ),
        );
      }

      if (users) {
        // Delete existing users
        await tx.user.deleteMany({});
        imported.users = await Promise.all(
          users.map((user: Record<string, unknown>) =>
            tx.user.create({
              data: {
                alias: user.alias as string,
                name: user.name as string,
                password: user.password as string,
                isAdmin: (user.isAdmin as boolean) || false,
                isTeamLeader: (user.isTeamLeader as boolean) || false,
                teamId: (user.teamId as string) || null,
              },
            }),
          ),
        );
      }

      if (challenges) {
        // Delete existing challenges
        await tx.challenge.deleteMany({});
        imported.challenges = await Promise.all(
          challenges.map((challenge: Record<string, unknown>) =>
            tx.challenge.create({
              data: {
                title: challenge.title as string,
                description: challenge.description as string,
                points: (challenge.points as number) || 0,
                category: (challenge.category as string) || "web",
                difficulty: (challenge.difficulty as string) || "easy",
                isActive: (challenge.isActive as boolean) || true,
                isLocked: (challenge.isLocked as boolean) || false,
                link: (challenge.link as string) || "",
              },
            }),
          ),
        );
      }

      if (announcements) {
        // Delete existing announcements
        await tx.announcement.deleteMany({});
        imported.announcements = await Promise.all(
          announcements.map((announcement: Record<string, unknown>) =>
            tx.announcement.create({
              data: {
                title: announcement.title as string,
                content: announcement.content as string,
              },
            }),
          ),
        );
      }

      if (gameConfig) {
        // Delete existing game config
        await tx.gameConfig.deleteMany({});
        imported.gameConfig = await tx.gameConfig.create({
          data: {
            startTime: new Date(gameConfig.startTime as string),
            endTime: gameConfig.endTime
              ? new Date(gameConfig.endTime as string)
              : null,
          },
        });
      }

      return imported;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
