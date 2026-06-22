import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const MAX_TEAM_MEMBERS = 4;

// GET /api/teams — Get current user's team info
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      team: {
        include: {
          members: {
            select: {
              id: true,
              alias: true,
              name: true,
              isTeamLeader: true,
            },
          },
        },
      },
    },
  });

  if (!user?.team) {
    return NextResponse.json({ team: null });
  }

  return NextResponse.json({ team: user.team });
}

// POST /api/teams — Create or join a team
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a team
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (currentUser?.teamId) {
    return NextResponse.json(
      { error: "You are already in a team" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { action, teamName, teamCode } = body;

  if (action === "create") {
    // Create a new team
    if (!teamName || teamName.length > 32) {
      return NextResponse.json(
        { error: "Team name is required (max 32 chars)" },
        { status: 400 }
      );
    }

    const existingTeam = await prisma.team.findUnique({
      where: { name: teamName },
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: "Team name is already taken" },
        { status: 409 }
      );
    }

    // Generate a cryptographically secure invite code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();

    const team = await prisma.team.create({
      data: {
        name: teamName,
        code,
        members: {
          connect: { id: session.user.id },
        },
      },
    });

    // Make user team leader
    await prisma.user.update({
      where: { id: session.user.id },
      data: { isTeamLeader: true },
    });

    return NextResponse.json(
      { message: "Team created", team: { id: team.id, name: team.name, code: team.code } },
      { status: 201 }
    );
  }

  if (action === "join") {
    // Join an existing team by invite code
    if (!teamCode) {
      return NextResponse.json(
        { error: "Team code is required" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { code: teamCode },
      include: { members: true },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Invalid team code" },
        { status: 404 }
      );
    }

    // Enforce max team size
    if (team.members.length >= MAX_TEAM_MEMBERS) {
      return NextResponse.json(
        { error: `Team is full (max ${MAX_TEAM_MEMBERS} members)` },
        { status: 400 }
      );
    }

    // Update user to join team
    await prisma.user.update({
      where: { id: session.user.id },
      data: { teamId: team.id },
    });

    return NextResponse.json({
      message: "Joined team",
      team: { id: team.id, name: team.name },
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
