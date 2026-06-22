import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// --------------- IP Rate Limiter ---------------
// Sliding-window counter per IP. Runs in Edge Runtime memory,
// one bucket per serverless instance — acceptable for volumetric abuse
// prevention (not a hard security boundary, but raises the bar).

const WINDOW_MS = 10_000; // 10-second window
const MAX_REQUESTS = 30;  // 30 requests per window

interface Bucket {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, Bucket>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS;
}

// Periodic cleanup to avoid unbounded memory growth.
// Runs at most once per WINDOW_MS.
let lastCleanup = 0;
function cleanupStale() {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;

  for (const [ip, bucket] of ipBuckets) {
    if (now >= bucket.resetAt) {
      ipBuckets.delete(ip);
    }
  }
}

// --------------- Middleware ---------------

export async function middleware(request: NextRequest) {
  // --- Rate limit ALL API routes by IP ---
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  cleanupStale();

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  // --- Protect admin API routes ---
  const isAdminRoute = request.nextUrl.pathname.startsWith("/api/admin");

  if (isAdminRoute) {
    const token = await getToken({ req: request });
    if (!token?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
