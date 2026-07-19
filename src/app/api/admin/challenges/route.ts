import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidate, CACHE_KEYS } from "@/lib/cache";
import { isValidChallengeLink, isValidPoints } from "@/lib/validation";

// GET /api/admin/challenges — List all challenges (admin)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const challenges = await prisma.challenge.findMany({
    include: {
      flags: true,
      files: true,
      hints: true,
      unlockConditions: true,
      _count: {
        select: { submissions: { where: { isCorrect: true } } },
      },
    },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ challenges });
}

// POST /api/admin/challenges — Create a new challenge
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      flags,
      hints,
    } = body;

    if (!title || !description || points === undefined || !category || !difficulty) {
      return NextResponse.json(
        { error: "title, description, points, category, and difficulty are required" },
        { status: 400 }
      );
    }

    if (!isValidPoints(points)) {
      return NextResponse.json(
        { error: "points must be a non-negative integer" },
        { status: 400 }
      );
    }

    if (
      (flags?.length && !flags.every((f: { points: unknown }) => isValidPoints(f.points))) ||
      (hints?.length && !hints.every((h: { cost: unknown }) => isValidPoints(h.cost)))
    ) {
      return NextResponse.json(
        { error: "flag points and hint costs must be non-negative integers" },
        { status: 400 }
      );
    }

    if (!isValidChallengeLink(link)) {
      return NextResponse.json(
        { error: "link must be an http(s) URL" },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        points: Number(points),
        flag: multipleFlags ? null : flag,
        multipleFlags: Boolean(multipleFlags),
        category,
        difficulty,
        isActive: isActive !== false,
        isLocked: Boolean(isLocked),
        link: link || null,
        solveExplanation: solveExplanation || null,
        flags: multipleFlags && flags?.length
          ? {
              create: flags.map((f: { flag: string; points: number }) => ({
                flag: f.flag,
                points: Number(f.points),
              })),
            }
          : undefined,
        hints: hints?.length
          ? {
              create: hints.map((h: { content: string; cost: number }) => ({
                content: h.content,
                cost: Number(h.cost),
              })),
            }
          : undefined,
      },
      include: { flags: true, hints: true },
    });

    invalidate(CACHE_KEYS.CHALLENGES);
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error("Challenge creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
