import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/announcements — Get all announcements
export async function GET() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcements });
}
