import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const MAX_TEAM_MEMBERS = 4;
const JOIN_LOCKOUT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_JOIN_FAILURES = 5;

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
      { status: 400 },
    );
  }

  const body = await request.json();
  const { action, teamName, teamCode } = body;

  if (action === "create") {
    // Create a new team
    const trimmedName = typeof teamName === "string" ? teamName.trim() : "";
    if (!trimmedName || trimmedName.length > 32) {
      return NextResponse.json(
        { error: "Team name is required (max 32 chars)" },
        { status: 400 },
      );
    }

    // Generate a cryptographically secure invite code (48 bits → 12 hex chars)
    const code = crypto.randomBytes(6).toString("hex").toUpperCase();

    let team: { id: string; name: string; code: string };
    try {
      // Atomic: if the leader assignment fails (user grabbed a team
      // concurrently), the team creation rolls back too.
      team = await prisma.$transaction(async (tx) => {
        const created = await tx.team.create({
          data: { name: trimmedName, code },
        });

        // Conditional update guards the "already in a team" TOCTOU race
        const joined = await tx.user.updateMany({
          where: { id: session.user.id, teamId: null },
          data: { teamId: created.id, isTeamLeader: true },
        });

        if (joined.count === 0) {
          throw new Error("ALREADY_IN_TEAM");
        }

        return created;
      });
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "Team name is already taken" },
          { status: 409 },
        );
      }
      if (err.message === "ALREADY_IN_TEAM") {
        return NextResponse.json(
          { error: "You are already in a team" },
          { status: 400 },
        );
      }
      console.error("Team creation error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Team created",
        team: { id: team.id, name: team.name, code: team.code },
      },
      { status: 201 },
    );
  }

  if (action === "join") {
    // Join an existing team by invite code
    if (
      typeof teamCode !== "string" ||
      !teamCode.trim() ||
      teamCode.length > 64
    ) {
      return NextResponse.json(
        { error: "Team code is required" },
        { status: 400 },
      );
    }

    // Brute-force lockout — per user, 5 failures in 10 minutes
    const recentFailures = await prisma.teamJoinAttempt.count({
      where: {
        userId: session.user.id,
        success: false,
        createdAt: { gte: new Date(Date.now() - JOIN_LOCKOUT_WINDOW_MS) },
      },
    });

    if (recentFailures >= MAX_JOIN_FAILURES) {
      return NextResponse.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 429 },
      );
    }

    let joinedTeam: { id: string; name: string } | null = null;
    let failureReason: "INVALID_CODE" | "TEAM_FULL" | null = null;

    try {
      // Serializable transaction prevents race condition:
      // two concurrent joins can't both read count < MAX and both succeed
      joinedTeam = await prisma.$transaction(
        async (tx) => {
          const team = await tx.team.findUnique({
            where: { code: teamCode.trim() },
            include: { members: { select: { id: true } } },
          });

          if (!team) {
            throw new Error("INVALID_CODE");
          }

          if (team.members.length >= MAX_TEAM_MEMBERS) {
            throw new Error("TEAM_FULL");
          }

          // Conditional update guards the "already in a team" TOCTOU race
          const joined = await tx.user.updateMany({
            where: { id: session.user.id, teamId: null },
            data: { teamId: team.id },
          });

          if (joined.count === 0) {
            throw new Error("ALREADY_IN_TEAM");
          }

          return { id: team.id, name: team.name };
        },
        {
          isolationLevel: "Serializable",
        },
      );
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      if (err.message === "TEAM_FULL") {
        failureReason = "TEAM_FULL";
      } else if (err.message === "ALREADY_IN_TEAM") {
        return NextResponse.json(
          { error: "You are already in a team" },
          { status: 400 },
        );
      } else if (err.code === "P2034") {
        // Serialization conflict — ask client to retry
        return NextResponse.json(
          { error: "Please try again" },
          { status: 409 },
        );
      } else {
        failureReason = "INVALID_CODE";
      }
    }

    // Record attempt (both success and failure)
    await prisma.teamJoinAttempt.create({
      data: { userId: session.user.id, success: !!joinedTeam },
    });

    if (failureReason === "INVALID_CODE") {
      return NextResponse.json({ error: "Invalid team code" }, { status: 404 });
    }
    if (failureReason === "TEAM_FULL") {
      return NextResponse.json(
        { error: `Team is full (max ${MAX_TEAM_MEMBERS} members)` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Joined team",
      team: joinedTeam,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
