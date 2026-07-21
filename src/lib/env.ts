/** Parse a positive-integer env var, falling back when unset or invalid. */
export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
