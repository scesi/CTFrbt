import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withBcryptSlot, BcryptBusyError } from "@/lib/bcrypt-limit";
import { validateNewUserCredentials } from "@/lib/credentials-validation";

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
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { alias, name, password, isAdmin, isTeamLeader, teamId } = body;

    const validation = validateNewUserCredentials({ alias, name, password });
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status },
      );
    }

    const trimmedAlias = (alias as string).trim();
    const trimmedName = (name as string).trim();

    const existingUser = await prisma.user.findUnique({
      where: { alias: trimmedAlias },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Alias already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await withBcryptSlot(() =>
      bcrypt.hash(password as string, 12),
    );

    let teamIdValue: string | null | undefined;
    if (teamId !== undefined) {
      if (teamId === "") {
        teamIdValue = null;
      } else if (typeof teamId === "string") {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
        });
        if (!team) {
          return NextResponse.json(
            { error: "Team not found" },
            { status: 404 },
          );
        }
        teamIdValue = teamId;
      } else {
        return NextResponse.json(
          { error: "teamId must be a string" },
          { status: 400 },
        );
      }
    }

    if (isTeamLeader) {
      if (!teamIdValue) {
        return NextResponse.json(
          { error: "User must be in a team to be a leader" },
          { status: 400 },
        );
      }

      const existingLeader = await prisma.user.findFirst({
        where: { teamId: teamIdValue, isTeamLeader: true },
        select: { id: true, alias: true },
      });

      if (existingLeader) {
        return NextResponse.json(
          { error: "Team already has a leader" },
          { status: 400 },
        );
      }
    }

    const user = await prisma.user.create({
      data: {
        alias: trimmedAlias,
        name: trimmedName,
        password: hashedPassword,
        isAdmin: isAdmin || false,
        isTeamLeader: isTeamLeader || false,
        ...(teamIdValue !== undefined && { teamId: teamIdValue }),
      },
      select: {
        id: true,
        alias: true,
        name: true,
        isAdmin: true,
        isTeamLeader: true,
        teamId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof BcryptBusyError) {
      return NextResponse.json(
        { error: "Server busy, please try again shortly" },
        { status: 503 },
      );
    }
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Team already has a leader" },
        { status: 400 },
      );
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
