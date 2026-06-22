import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { startTime, endTime, isActive } = body;

    if (!startTime) {
      return NextResponse.json(
        { error: "startTime is required" },
        { status: 400 }
      );
    }

    // Upsert — only one active game config
    const existing = await prisma.gameConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let config;
    if (existing) {
      config = await prisma.gameConfig.update({
        where: { id: existing.id },
        data: {
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          isActive: isActive !== false,
        },
      });
    } else {
      config = await prisma.gameConfig.create({
        data: {
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          isActive: isActive !== false,
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Game config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
