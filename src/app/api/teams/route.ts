import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const MAX_TEAM_MEMBERS = 4;
const JOIN_LOCKOUT_WINDOW_MS = 10 * 60 * 1000;
const MAX_JOIN_FAILURES = 5;

const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const MAX_ICON_LENGTH = 64;

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

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.teamId) {
    return NextResponse.json(
      { error: "You are not in a team" },
      { status: 400 },
    );
  }

  if (!user.isTeamLeader) {
    return NextResponse.json(
      { error: "Only the team leader can customize the team" },
      { status: 403 },
    );
  }

  let body: { icon?: unknown; color?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { icon, color } = body;

  if (icon !== undefined) {
    if (
      typeof icon !== "string" ||
      icon.length === 0 ||
      icon.length > MAX_ICON_LENGTH
    ) {
      return NextResponse.json(
        { error: `icon must be a string of max ${MAX_ICON_LENGTH} characters` },
        { status: 400 },
      );
    }
  }

  if (color !== undefined) {
    if (typeof color !== "string" || !COLOR_REGEX.test(color)) {
      return NextResponse.json(
        { error: "color must be a hex color like #ff00aa" },
        { status: 400 },
      );
    }
  }

  const team = await prisma.team.update({
    where: { id: user.teamId },
    data: {
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
    },
    select: {
      id: true,
      name: true,
      code: true,
      icon: true,
      color: true,
      score: true,
    },
  });

  return NextResponse.json({ team });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const trimmedName = typeof teamName === "string" ? teamName.trim() : "";
    if (!trimmedName || trimmedName.length > 32) {
      return NextResponse.json(
        { error: "Team name is required (max 32 chars)" },
        { status: 400 },
      );
    }

    const code = crypto.randomBytes(6).toString("hex").toUpperCase();

    const cyberpunkColors = [
      "#8a2be2",
      "#00bfff",
      "#ff69b4",
      "#39ff14",
      "#ff1493",
      "#00ffff",
      "#ff6347",
      "#9370db",
    ];
    const color =
      cyberpunkColors[Math.floor(Math.random() * cyberpunkColors.length)];

    let team: { id: string; name: string; code: string };
    try {
      team = await prisma.$transaction(async (tx) => {
        const created = await tx.team.create({
          data: { name: trimmedName, code, color },
        });
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
        return NextResponse.json(
          { error: "Please try again" },
          { status: 409 },
        );
      } else {
        failureReason = "INVALID_CODE";
      }
    }

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
