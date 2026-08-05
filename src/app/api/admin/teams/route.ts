import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/teams - List all teams with member count
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        icon: true,
        color: true,
        score: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { score: "desc" },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error listing teams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
