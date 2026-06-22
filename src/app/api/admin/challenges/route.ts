import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    if (!title || !description || !points || !category || !difficulty) {
      return NextResponse.json(
        { error: "title, description, points, category, and difficulty are required" },
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

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error("Challenge creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
