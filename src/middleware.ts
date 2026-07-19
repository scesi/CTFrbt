import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// --------------- IP Rate Limiter ---------------

const WINDOW_MS = 10_000;
const MAX_REQUESTS = 30;
const MAX_BUCKETS = 10_000;

const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_REQUESTS = 10;

interface Bucket {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, Bucket>();
const authBuckets = new Map<string, Bucket>();

function isRateLimited(
  buckets: Map<string, Bucket>,
  ip: string,
  windowMs: number,
  maxRequests: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    if (!bucket && buckets.size >= MAX_BUCKETS) {
      buckets.clear();
    }
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > maxRequests;
}

let lastCleanup = 0;
function cleanupStale() {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;

  for (const buckets of [ipBuckets, authBuckets]) {
    for (const [ip, bucket] of buckets) {
      if (now >= bucket.resetAt) {
        buckets.delete(ip);
      }
    }
  }
}

// --------------- Middleware ---------------

export async function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  cleanupStale();

  if (isRateLimited(ipBuckets, ip, WINDOW_MS, MAX_REQUESTS)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path === "/api/auth/register" ||
    path.startsWith("/api/auth/callback/credentials");

  if (
    isAuthRoute &&
    isRateLimited(authBuckets, ip, AUTH_WINDOW_MS, AUTH_MAX_REQUESTS)
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
