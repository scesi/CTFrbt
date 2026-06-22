import { prisma } from "@/lib/prisma";
import { getOrSet, CACHE_KEYS } from "@/lib/cache";

const GAME_CONFIG_TTL_MS = 5_000; // 5s — consulted on every submission

export type GameWindowStatus =
  | { state: "not_configured" }
  | { state: "not_started"; startsAt: Date }
  | { state: "ended"; endedAt: Date }
  | { state: "active" };

/**
 * Resolves the current game window state from the most recent GameConfig.
 *
 * - `not_configured` → treated as "open" (dev/testing without a GameConfig row).
 * - `not_started`    → CTF hasn't started yet, block submissions & hide content.
 * - `ended`          → CTF has ended, block submissions.
 * - `active`         → CTF is live, all systems go.
 */
export async function getGameWindowStatus(): Promise<GameWindowStatus> {
  const config = await getOrSet(CACHE_KEYS.GAME_CONFIG, GAME_CONFIG_TTL_MS, () =>
    prisma.gameConfig.findFirst({ orderBy: { createdAt: "desc" } })
  );

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
