import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSet, CACHE_KEYS } from "@/lib/cache";

const ANNOUNCEMENTS_TTL_MS = 15_000; // 15 seconds

// GET /api/announcements — Get all announcements
export async function GET() {
  const announcements = await getOrSet(
    CACHE_KEYS.ANNOUNCEMENTS,
    ANNOUNCEMENTS_TTL_MS,
    async () => {
      return prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
      });
    },
  );

  return NextResponse.json({ announcements });
}
