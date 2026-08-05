import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withBcryptSlot, BcryptBusyError } from "@/lib/bcrypt-limit";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/credentials-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, isAdmin, isTeamLeader, teamId, password } = body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (password !== undefined) {
      if (typeof password !== "string") {
        return NextResponse.json(
          { error: "password must be a string" },
          { status: 400 },
        );
      }
      if (/\s/.test(password)) {
        return NextResponse.json(
          { error: "Password must not contain spaces" },
          { status: 400 },
        );
      }
      if (
        password.length < PASSWORD_MIN_LENGTH ||
        password.length > PASSWORD_MAX_LENGTH
      ) {
        return NextResponse.json(
          { error: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters` },
          { status: 400 },
        );
      }
    }

    if (name !== undefined) {
      if (typeof name !== "string") {
        return NextResponse.json(
          { error: "name must be a string" },
          { status: 400 },
        );
      }
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: "name must not be empty" },
          { status: 400 },
        );
      }
      if (name.length > 48) {
        return NextResponse.json(
          { error: "name must be max 48 characters" },
          { status: 400 },
        );
      }
    }

    let teamIdValue: string | null | undefined = undefined;
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

    let hashedPassword: string | undefined;
    if (password !== undefined) {
      hashedPassword = await withBcryptSlot(() => bcrypt.hash(password, 12));
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(typeof isAdmin === "boolean" && { isAdmin }),
          ...(typeof isTeamLeader === "boolean" && {
            isTeamLeader: isTeamLeader,
          }),
          ...(teamIdValue !== undefined && {
            teamId: teamIdValue,
          }),
          ...(hashedPassword !== undefined && { password: hashedPassword }),
        },
        select: {
          id: true,
          alias: true,
          name: true,
          isAdmin: true,
          isTeamLeader: true,
          teamId: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (hashedPassword !== undefined) {
        await tx.userSession.deleteMany({ where: { userId: id } });
      }

      return updated;
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof BcryptBusyError) {
      return NextResponse.json(
        { error: "Server busy, please try again shortly" },
        { status: 503 },
      );
    }
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.submission.deleteMany({ where: { userId: id } }),
      prisma.score.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
