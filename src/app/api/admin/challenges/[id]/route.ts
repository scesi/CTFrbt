import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidate, CACHE_KEYS } from "@/lib/cache";
import { isValidChallengeLink, isValidPoints } from "@/lib/validation";

// PUT /api/admin/challenges/[id] — Update a challenge
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      title,
      description,
      points,
      flag,
      multipleFlags,
      category,
      difficulty,
      isActive,
      isLocked,
      link,
      solveExplanation,
    } = body;

    if (points !== undefined && !isValidPoints(points)) {
      return NextResponse.json(
        { error: "points must be a non-negative integer" },
        { status: 400 }
      );
    }

    if (link !== undefined && !isValidChallengeLink(link)) {
      return NextResponse.json(
        { error: "link must be an http(s) URL" },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(points !== undefined && { points: Number(points) }),
        ...(flag !== undefined && { flag }),
        ...(multipleFlags !== undefined && { multipleFlags: Boolean(multipleFlags) }),
        ...(category !== undefined && { category }),
        ...(difficulty !== undefined && { difficulty }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(isLocked !== undefined && { isLocked: Boolean(isLocked) }),
        ...(link !== undefined && { link: link || null }),
        ...(solveExplanation !== undefined && { solveExplanation: solveExplanation || null }),
      },
    });

    invalidate(CACHE_KEYS.CHALLENGES);
    return NextResponse.json({ challenge });
  } catch (error) {
    console.error("Challenge update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/challenges/[id] — Delete a challenge
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.challenge.delete({ where: { id } });
    invalidate(CACHE_KEYS.CHALLENGES);
    return NextResponse.json({ message: "Challenge deleted" });
  } catch (error) {
    console.error("Challenge deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
