import { prisma } from "@/lib/prisma";

export type GameWindowStatus =
  | { state: "not_configured" }
  | { state: "not_started"; startsAt: Date }
  | { state: "ended"; endedAt: Date }
  | { state: "active" }
  | { state: "paused"; resumesAt: Date };

/**
 * Resolves the current game window state from the most recent GameConfig.
 *
 * - `not_configured` → treated as "open" (dev/testing without a GameConfig row).
 * - `not_started`    → CTF hasn't started yet, block submissions & hide content.
 * - `ended`          → CTF has ended, block submissions.
 * - `active`         → CTF is live, all systems go.
 */
export async function getGameWindowStatus(): Promise<GameWindowStatus> {
  // Read current state across workers: a process-local TTL cannot enforce a pause.
  const config = await prisma.gameConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (config?.pausedUntil && config.pausedUntil > new Date()) {
    return { state: "paused", resumesAt: config.pausedUntil };
  }

  if (!config || !config.isActive) {
    return { state: "not_configured" };
  }

  const now = new Date();

  if (now < config.startTime) {
    return { state: "not_started", startsAt: config.startTime };
  }

  if (config.endTime && now > config.endTime) {
    return { state: "ended", endedAt: config.endTime };
  }

  return { state: "active" };
}
