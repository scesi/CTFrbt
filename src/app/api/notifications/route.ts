import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  NotificationsResponse,
  isFreezeWarningActive,
  createFreezeWarningNotification,
  createAnnouncementNotification,
} from "@/lib/notifications";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.isAdmin === true;

    const [gameConfig, announcements] = await Promise.all([
      prisma.gameConfig.findFirst({
        orderBy: { createdAt: "desc" },
        select: { endTime: true, leaderboardFreezeMinutes: true },
      }),
      prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, content: true, createdAt: true },
      }),
    ]);

    const endTime = gameConfig?.endTime
      ? new Date(gameConfig.endTime).toISOString()
      : null;
    const freezeMinutes = gameConfig?.leaderboardFreezeMinutes ?? 0;

    const now = Date.now();
    const freezeWarning = isFreezeWarningActive(endTime, freezeMinutes, now);

    const notifications: NotificationsResponse["notifications"] = [];

    // Add freeze warning if active and user is not admin
    if (freezeWarning.active && !isAdmin) {
      notifications.push(
        createFreezeWarningNotification(
          freezeWarning.minutesRemaining,
          freezeWarning.freezeAt,
        ),
      );
    }

    // Add announcements
    for (const announcement of announcements) {
      notifications.push(
        createAnnouncementNotification({
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          createdAt: announcement.createdAt.toISOString(),
        }),
      );
    }

    const response: NotificationsResponse = {
      notifications,
      freezeAt: freezeWarning.freezeAt || 0,
      freezeMinutes,
      endTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
