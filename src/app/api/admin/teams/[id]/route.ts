import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/teams/[id] - Update team name
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
    const { name, icon, color, code } = body;

    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Validate field types and basic constraints when provided
    if (name !== undefined && (typeof name !== "string" || name.length > 32)) {
      return NextResponse.json(
        { error: "name must be a string of max 32 characters" },
        { status: 400 },
      );
    }
    if (icon !== undefined && typeof icon !== "string") {
      return NextResponse.json(
        { error: "icon must be a string" },
        { status: 400 },
      );
    }
    if (color !== undefined && typeof color !== "string") {
      return NextResponse.json(
        { error: "color must be a string" },
        { status: 400 },
      );
    }
    if (
      code !== undefined &&
      (typeof code !== "string" || code.length === 0 || code.length > 12)
    ) {
      return NextResponse.json(
        { error: "code must be a string of 1-12 characters" },
        { status: 400 },
      );
    }

    if (code !== undefined && code !== team.code) {
      const existing = await prisma.team.findUnique({
        where: { code },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Team code is already taken" },
          { status: 409 },
        );
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(code !== undefined && { code }),
      },
      select: {
        id: true,
        name: true,
        code: true,
        icon: true,
        color: true,
        score: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Team name or code is already taken" },
        { status: 409 },
      );
    }
    console.error("Error updating team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/teams/[id] - Delete a team (removes teamId from members, doesn't delete users)
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

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Remove teamId from all members (don't delete users)
    await prisma.user.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    // Delete team (cascade will handle related data per schema)
    await prisma.team.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
