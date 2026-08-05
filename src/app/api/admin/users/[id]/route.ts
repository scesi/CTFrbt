import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/users/[id] - Update user properties (admin, team leader, name)
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
    const { name, isAdmin, isTeamLeader, teamId } = body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(typeof isAdmin === "boolean" && { isAdmin }),
        ...(typeof isTeamLeader === "boolean" && { isTeamLeader }),
        ...(teamIdValue !== undefined && { teamId: teamIdValue }),
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

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/users/[id] - Admin-only; cascades to related data
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

    // Prevent self-deletion
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

    // Remove the user's own activity first: submissions and scores reference
    // the user with RESTRICT semantics, so they must be deleted explicitly.
    // Sessions cascade on delete.
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
