import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidate, CACHE_KEYS } from "@/lib/cache";

// GET /api/admin/game — Get game config
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.gameConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ config });
}

// POST /api/admin/game — Create or update game config
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      startTime,
      endTime,
      isActive,
      registrationEnabled,
      leaderboardFreezeMinutes,
    } = body;

    if (!startTime) {
      return NextResponse.json(
        { error: "startTime is required" },
        { status: 400 },
      );
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;

    if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) {
      return NextResponse.json(
        { error: "startTime/endTime must be valid dates" },
        { status: 400 },
      );
    }

    if (end && end <= start) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 },
      );
    }

    // Validate leaderboardFreezeMinutes
    let freezeMinutes: number | null = null;
    if (
      leaderboardFreezeMinutes !== undefined &&
      leaderboardFreezeMinutes !== null
    ) {
      const parsed = Number(leaderboardFreezeMinutes);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "leaderboardFreezeMinutes must be a non-negative integer" },
          { status: 400 },
        );
      }
      if (end && parsed > 0) {
        const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        if (parsed > totalMinutes) {
          return NextResponse.json(
            {
              error:
                "leaderboardFreezeMinutes cannot exceed total competition duration",
            },
            { status: 400 },
          );
        }
      }
      freezeMinutes = parsed;
    }

    // Upsert — only one active game config
    const existing = await prisma.gameConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let config;
    const data = {
      startTime: start,
      endTime: end,
      isActive: isActive !== false,
      ...(registrationEnabled !== undefined && {
        registrationEnabled: registrationEnabled === true,
      }),
      ...(freezeMinutes !== null && {
        leaderboardFreezeMinutes: freezeMinutes,
      }),
    };
    if (existing) {
      config = await prisma.gameConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      config = await prisma.gameConfig.create({
        data,
      });
    }

    invalidate(CACHE_KEYS.GAME_CONFIG);
    return NextResponse.json({ config });
  } catch (error) {
    console.error("Game config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
