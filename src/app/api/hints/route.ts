import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/hints?challengeId=xxx — Get hints for a challenge
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const challengeId = searchParams.get("challengeId");

  if (!challengeId) {
    return NextResponse.json(
      { error: "challengeId is required" },
      { status: 400 }
    );
  }

  const hints = await prisma.hint.findMany({
    where: { challengeId },
    orderBy: { cost: "asc" },
    select: {
      id: true,
      cost: true,
      content: true,
      teamHints: session?.user?.teamId
        ? {
            where: { teamId: session.user.teamId },
            select: { id: true },
          }
        : false,
    },
  });

  // Only show content for purchased hints
  const enrichedHints = hints.map((hint) => ({
    id: hint.id,
    cost: hint.cost,
    purchased:
      session?.user?.teamId &&
      "teamHints" in hint &&
      Array.isArray(hint.teamHints) &&
      hint.teamHints.length > 0,
    content:
      session?.user?.teamId &&
      "teamHints" in hint &&
      Array.isArray(hint.teamHints) &&
      hint.teamHints.length > 0
        ? hint.content
        : null,
  }));

  return NextResponse.json({ hints: enrichedHints });
}

// POST /api/hints — Purchase a hint
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.teamId) {
    return NextResponse.json(
      { error: "You must be in a team to purchase hints" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { hintId } = body;

  if (!hintId) {
    return NextResponse.json(
      { error: "hintId is required" },
      { status: 400 }
    );
  }

  const hint = await prisma.hint.findUnique({
    where: { id: hintId },
  });

  if (!hint) {
    return NextResponse.json({ error: "Hint not found" }, { status: 404 });
  }

  // Check if already purchased
  const existing = await prisma.teamHint.findUnique({
    where: {
      teamId_hintId: {
        teamId: session.user.teamId,
        hintId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Hint already purchased", content: hint.content },
      { status: 200 }
    );
  }

  // Purchase: create TeamHint and deduct points
  await prisma.teamHint.create({
    data: {
      teamId: session.user.teamId,
      hintId,
    },
  });

  if (hint.cost > 0) {
    const updatedTeam = await prisma.team.update({
      where: { id: session.user.teamId },
      data: { score: { decrement: hint.cost } },
    });

    await prisma.teamPointHistory.create({
      data: {
        teamId: session.user.teamId,
        points: -hint.cost,
        totalPoints: updatedTeam.score,
        reason: "HINT_PURCHASE",
        metadata: JSON.stringify({ hintId, challengeId: hint.challengeId }),
      },
    });
  }

  return NextResponse.json({
    message: "Hint purchased",
    content: hint.content,
    cost: hint.cost,
  });
}
