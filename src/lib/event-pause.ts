import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGameWindowStatus } from "@/lib/game-window";
import type { Prisma } from "../../prisma/generated/client";

export function pauseResponse(resumesAt?: Date) {
  return NextResponse.json(
    { error: "The CTF is paused", code: "EVENT_PAUSED", resumesAt },
    { status: 403, headers: { "Cache-Control": "private, no-store" } },
  );
}

// Session is supplied by authenticated routes to avoid reading it twice.
export async function blockDuringPause(isAdmin?: boolean) {
  if (isAdmin === true) return null;
  const state = await getGameWindowStatus();
  if (state.state !== "paused") return null;
  if (
    isAdmin === undefined &&
    (await getServerSession(authOptions))?.user?.isAdmin
  )
    return null;
  return pauseResponse(state.resumesAt);
}

export class EventPausedError extends Error {}

// Shared locks let submissions run concurrently; pause/resume takes the exclusive
// counterpart. An in-flight scoring transaction finishes before pause is confirmed.
export async function assertEventNotPaused(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(72461124)`;
  const config = await tx.gameConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (config?.pausedUntil && config.pausedUntil > new Date())
    throw new EventPausedError();
}
