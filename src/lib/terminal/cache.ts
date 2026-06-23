const CACHE_TTL_MS = 10_000; // same order of magnitude as server cache

interface CacheEntry {
  data: unknown;
  expiry: number;
}

export const apiCache: Record<string, CacheEntry> = {};

export async function fetchCached(url: string, force = false): Promise<unknown> {
  const now = Date.now();
  const cached = apiCache[url];

  if (!force && cached && cached.expiry > now) {
    return cached.data;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("API request failed");
  const data = await res.json();
  apiCache[url] = { data, expiry: now + CACHE_TTL_MS };
  return data;
}

export function invalidateCache(url: string) {
  delete apiCache[url];
}
