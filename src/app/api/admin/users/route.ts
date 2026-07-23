import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users - List all users with team info
// Admin-only endpoint to view all users in the system
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        alias: true,
        name: true,
        isAdmin: true,
        isTeamLeader: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            scores: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user (if needed for admin panel)
// Currently unused, but kept for potential bulk user creation
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { alias, name, password, isAdmin, isTeamLeader } = body;

    if (!alias || !name || !password) {
      return NextResponse.json(
        { error: "alias, name, and password are required" },
        { status: 400 }
      );
    }

    if (alias.length > 32 || name.length > 48) {
      return NextResponse.json(
        { error: "alias (max 32) and name (max 48) constraints violated" },
        { status: 400 }
      );
    }

    // Check if alias already exists
    const existingUser = await prisma.user.findUnique({
      where: { alias },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Alias already exists" },
        { status: 409 }
      );
    }

    // Note: Password hashing should be done here with bcryptjs
    // For now, we'll accept raw password (should implement hashing in production)
    const user = await prisma.user.create({
      data: {
        alias,
        name,
        password, // TODO: Hash with bcryptjs before saving
        isAdmin: isAdmin || false,
        isTeamLeader: isTeamLeader || false,
      },
      select: {
        id: true,
        alias: true,
        name: true,
        isAdmin: true,
        isTeamLeader: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
