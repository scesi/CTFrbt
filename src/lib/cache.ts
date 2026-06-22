/**
 * Minimal in-memory cache for serverless edge.
 *
 * Each key stores { data, expiry }.  `getOrSet` is the only public API:
 *   - Cache hit  → returns stored data instantly, zero DB cost.
 *   - Cache miss → calls `fetcher()`, stores result, returns it.
 *
 * `invalidate(key)` drops a specific entry (used after mutations).
 *
 * Limitations (intentional):
 *   - Lives in process memory → one cache per serverless instance.
 *   - No cross-instance sync — acceptable because TTLs are short (10-15s)
 *     and the worst case is a brief stale read, not incorrect data.
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Returns cached data if still valid, otherwise calls `fetcher`,
 * caches the result for `ttlMs` milliseconds, and returns it.
 */
export async function getOrSet<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = store.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  const data = await fetcher();
  store.set(key, { data, expiry: now + ttlMs });
  return data;
}

/** Drop a specific cache entry (call after mutations). */
export function invalidate(key: string): void {
  store.delete(key);
}

// --------------- Well-known cache keys ---------------

export const CACHE_KEYS = {
  LEADERBOARD: "leaderboard",
  CHALLENGES: "challenges",
  GAME_CONFIG: "game-config",
} as const;
