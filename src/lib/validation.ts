/**
 * Shared input validators for API routes.
 */

/** Non-negative integer (accepts numeric strings, rejects NaN/negatives). */
export function isValidPoints(value: unknown): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

/**
 * Challenge links render as <a href> for players, so only allow
 * http(s) — blocks javascript:/data: URLs. null/undefined/"" are fine.
 */
export function isValidChallengeLink(link: unknown): boolean {
  if (link === undefined || link === null || link === "") return true;
  if (typeof link !== "string") return false;
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
