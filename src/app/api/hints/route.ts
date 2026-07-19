import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGameWindowStatus } from "@/lib/game-window";

// GET /api/hints?challengeId=xxx — Get hints for a challenge
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const challengeId = searchParams.get("challengeId");

  if (!challengeId) {
    return NextResponse.json(
      { error: "challengeId is required" },
      { status: 400 }
    );
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { isActive: true },
  });

  if (!challenge?.isActive) {
    return NextResponse.json(
      { error: "Challenge not found" },
      { status: 404 }
    );
  }

  const teamId = session.user.teamId;

  const hints = await prisma.hint.findMany({
    where: { challengeId },
    orderBy: { cost: "asc" },
    select: {
      id: true,
      cost: true,
      content: true,
      teamHints: teamId
        ? {
            where: { teamId },
            select: { id: true },
          }
        : false,
    },
  });

  // Only show content for purchased hints
  const enrichedHints = hints.map((hint) => {
    const purchased =
      !!teamId &&
      "teamHints" in hint &&
      Array.isArray(hint.teamHints) &&
      hint.teamHints.length > 0;
    return {
      id: hint.id,
      cost: hint.cost,
      purchased,
      content: purchased ? hint.content : null,
    };
  });

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
  const teamId = session.user.teamId;

  // Hint purchases change team scores — only allowed while the CTF runs
  const gameStatus = await getGameWindowStatus();
  if (gameStatus.state === "not_started") {
    return NextResponse.json(
      { error: "The CTF hasn't started yet" },
      { status: 403 }
    );
  }
  if (gameStatus.state === "ended") {
    return NextResponse.json({ error: "The CTF has ended" }, { status: 403 });
  }

  const body = await request.json();
  const { hintId } = body;

  if (typeof hintId !== "string" || !hintId) {
    return NextResponse.json(
      { error: "hintId is required" },
      { status: 400 }
    );
  }

  const hint = await prisma.hint.findUnique({
    where: { id: hintId },
    include: { challenge: { select: { isActive: true } } },
  });

  if (!hint || !hint.challenge.isActive) {
    return NextResponse.json({ error: "Hint not found" }, { status: 404 });
  }

  try {
    // Atomic purchase: the unique (teamId, hintId) constraint gates
    // duplicates, and the balance check + deduction can't interleave
    // with a concurrent purchase.
    await prisma.$transaction(
      async (tx) => {
        await tx.teamHint.create({
          data: { teamId, hintId },
        });

        if (hint.cost > 0) {
          const team = await tx.team.findUnique({
            where: { id: teamId },
            select: { score: true },
          });

          if (!team || team.score < hint.cost) {
            throw new Error("INSUFFICIENT_POINTS");
          }

          const updatedTeam = await tx.team.update({
            where: { id: teamId },
            data: { score: { decrement: hint.cost } },
          });

          await tx.teamPointHistory.create({
            data: {
              teamId,
              points: -hint.cost,
              totalPoints: updatedTeam.score,
              reason: "HINT_PURCHASE",
              metadata: JSON.stringify({ hintId, challengeId: hint.challengeId }),
            },
          });
        }
      },
      { isolationLevel: "Serializable" }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    if (err.code === "P2002") {
      // Already purchased by the team — safe to return the content
      return NextResponse.json(
        { message: "Hint already purchased", content: hint.content, cost: 0 },
        { status: 200 }
      );
    }
    if (err.message === "INSUFFICIENT_POINTS") {
      return NextResponse.json(
        { error: "Not enough points to purchase this hint" },
        { status: 400 }
      );
    }
    if (err.code === "P2034") {
      return NextResponse.json({ error: "Please try again" }, { status: 409 });
    }
    console.error("Hint purchase error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Hint purchased",
    content: hint.content,
    cost: hint.cost,
  });
}
