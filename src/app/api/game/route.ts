import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/game - Public endpoint to get game config
export async function GET() {
  try {
    const config = await prisma.gameConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      gameConfig: config
        ? {
            startTime: config.startTime.toISOString(),
            endTime: config.endTime?.toISOString() || null,
            isActive: config.isActive,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching game config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
