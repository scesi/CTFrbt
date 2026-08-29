import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSet, CACHE_KEYS } from "@/lib/cache";

const GAME_CONFIG_TTL_MS = 15_000; // 15 seconds

// GET /api/game - Public endpoint to get game config
export async function GET() {
  try {
    const config = await getOrSet(
      CACHE_KEYS.GAME_CONFIG,
      GAME_CONFIG_TTL_MS,
      async () => {
        return prisma.gameConfig.findFirst({
          orderBy: { createdAt: "desc" },
        });
      },
    );

    return NextResponse.json({
      gameConfig: config
        ? {
            startTime: config.startTime.toISOString(),
            endTime: config.endTime?.toISOString() || null,
            isActive: config.isActive,
            registrationEnabled: config.registrationEnabled,
            leaderboardFreezeMinutes: config.leaderboardFreezeMinutes ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching game config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
