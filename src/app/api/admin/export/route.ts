import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Rec = Record<string, unknown>;
type ImportBody = Partial<{
  teams: Rec[];
  challenges: Rec[];
  users: Rec[];
  announcements: Rec[];
  gameConfig: Rec | null;
}>;

// --- Internal validation error used to map failures to 400/409/500 ---
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const isRecord = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isStrId = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

// numberOrThrow: only a finite number is accepted; null/undefined fall back to
// the provided default; any other type throws a ValidationError. This rejects
// strings, NaN, Infinity, booleans and objects so invalid payloads are never
// silently coerced.
function numberOrThrow(v: unknown, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new ValidationError("Expected a finite number");
  }
  return v;
}

// boolOrThrow: only a real boolean is accepted; undefined falls back to the
// default; any other type (including "false" strings) throws.
function boolOrThrow(v: unknown, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  if (typeof v !== "boolean") {
    throw new ValidationError("Expected a boolean");
  }
  return v;
}

// GET /api/admin/export - Export all data
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [challenges, teams, announcements, gameConfig] = await Promise.all([
      prisma.challenge.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          points: true,
          flag: true,
          multipleFlags: true,
          category: true,
          difficulty: true,
          isActive: true,
          isLocked: true,
          link: true,
          solveExplanation: true,
          createdAt: true,
          updatedAt: true,
          flags: {
            select: {
              id: true,
              flag: true,
              points: true,
              challengeId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          hints: {
            select: {
              id: true,
              content: true,
              cost: true,
              challengeId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          unlockConditions: {
            select: {
              id: true,
              type: true,
              requiredChallengeId: true,
              timeThresholdSeconds: true,
              challengeId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.team.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          icon: true,
          color: true,
          score: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.announcement.findMany({
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.gameConfig.findFirst({
        select: {
          id: true,
          startTime: true,
          endTime: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      challenges,
      teams,
      announcements,
      gameConfig,
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/admin/export - Import data
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Minimal CSRF guard: reject explicit cross-site signals or an Origin that
  // does not match this request. Missing headers remain allowed because tests
  // and non-browser clients may omit them.
  const origin = request.headers.get("origin");
  if (origin) {
    const expected = new URL(request.url).origin;
    if (origin !== expected) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 },
      );
    }
  }
  if (request.headers.get("Sec-Fetch-Site") === "cross-site") {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 1. VALIDACIÓN DEL BODY: do not cast request.json() to ImportBody directly.
  if (parsed === null) {
    return NextResponse.json(
      { error: "Body must not be null" },
      { status: 400 },
    );
  }
  if (Array.isArray(parsed)) {
    return NextResponse.json(
      { error: "Body must be an object" },
      { status: 400 },
    );
  }
  if (typeof parsed !== "object") {
    return NextResponse.json(
      { error: "Body must be an object" },
      { status: 400 },
    );
  }

  const body = parsed as ImportBody;
  const { teams, users, challenges, announcements, gameConfig } = body;

  // Content-only contract: the JSON payload must not carry users.
  if (users !== undefined) {
    return NextResponse.json(
      { error: "users are not part of the content-only export" },
      { status: 400 },
    );
  }

  // Validate input: reject a totally empty payload.
  if (!teams && !users && !challenges && !announcements && !gameConfig) {
    return NextResponse.json(
      { error: "No data provided for import" },
      { status: 400 },
    );
  }

  // Section type validation (absent sections remain allowed).
  if (teams !== undefined && !Array.isArray(teams)) {
    return NextResponse.json(
      { error: "teams must be an array" },
      { status: 400 },
    );
  }
  if (challenges !== undefined && !Array.isArray(challenges)) {
    return NextResponse.json(
      { error: "challenges must be an array" },
      { status: 400 },
    );
  }
  if (announcements !== undefined && !Array.isArray(announcements)) {
    return NextResponse.json(
      { error: "announcements must be an array" },
      { status: 400 },
    );
  }
  if (
    gameConfig !== undefined &&
    gameConfig !== null &&
    !isRecord(gameConfig)
  ) {
    return NextResponse.json(
      { error: "gameConfig must be an object" },
      { status: 400 },
    );
  }

  // Each element of a section must be a plain object.
  const sectionMustBeObjects = (arr: unknown): arr is Rec[] => {
    if (!Array.isArray(arr)) return true;
    return arr.every((e) => isRecord(e));
  };
  if (teams !== undefined && !sectionMustBeObjects(teams)) {
    return NextResponse.json(
      { error: "teams must be an array of objects" },
      { status: 400 },
    );
  }
  if (challenges !== undefined && !sectionMustBeObjects(challenges)) {
    return NextResponse.json(
      { error: "challenges must be an array of objects" },
      { status: 400 },
    );
  }
  if (announcements !== undefined && !sectionMustBeObjects(announcements)) {
    return NextResponse.json(
      { error: "announcements must be an array of objects" },
      { status: 400 },
    );
  }

  // --- pre-flight validation of identifiers ---
  if (Array.isArray(teams)) {
    for (const t of teams) {
      if (!isStrId(t.id)) {
        return NextResponse.json(
          { error: "team.id must be a non-empty string" },
          { status: 400 },
        );
      }
      if (typeof t.name !== "string" || t.name.length === 0) {
        return NextResponse.json(
          { error: "team.name must be a non-empty string" },
          { status: 400 },
        );
      }
      if (typeof t.code !== "string" || t.code.length === 0) {
        return NextResponse.json(
          { error: "team.code must be a non-empty string" },
          { status: 400 },
        );
      }
    }
  }
  if (Array.isArray(challenges)) {
    for (const c of challenges) {
      if (!isStrId(c.id)) {
        return NextResponse.json(
          { error: "challenge.id must be a non-empty string" },
          { status: 400 },
        );
      }
      if (c.hints !== undefined && !Array.isArray(c.hints)) {
        return NextResponse.json(
          { error: "challenge.hints must be an array" },
          { status: 400 },
        );
      }
      if (c.flags !== undefined && !Array.isArray(c.flags)) {
        return NextResponse.json(
          { error: "challenge.flags must be an array" },
          { status: 400 },
        );
      }
      if (
        c.unlockConditions !== undefined &&
        !Array.isArray(c.unlockConditions)
      ) {
        return NextResponse.json(
          { error: "challenge.unlockConditions must be an array" },
          { status: 400 },
        );
      }
    }
  }

  try {
    // Begin transaction for all-or-nothing import
    const result = await prisma.$transaction(async (tx) => {
      const imported: Record<string, unknown> = {};

      // --- Teams (upsert preserves IDs) ---
      if (Array.isArray(teams) && teams.length > 0) {
        for (const team of teams) {
          const id = team.id as string;
          await tx.team.upsert({
            where: { id },
            create: {
              id,
              name: team.name as string,
              code: team.code as string,
              icon: (team.icon as string) || "GiSpaceship",
              color: (team.color as string) || "#ffffff",
              score: numberOrThrow(team.score, 0),
            },
            update: {
              name: team.name as string,
              code: team.code as string,
              icon: (team.icon as string) || "GiSpaceship",
              color: (team.color as string) || "#ffffff",
              score: numberOrThrow(team.score, 0),
            },
          });
        }
        imported.teams = teams;
      }

      // --- Challenges (upsert preserves IDs) ---
      if (Array.isArray(challenges) && challenges.length > 0) {
        for (const challenge of challenges) {
          const id = challenge.id as string;
          await tx.challenge.upsert({
            where: { id },
            create: {
              id,
              title: challenge.title as string,
              description: challenge.description as string,
              points: numberOrThrow(challenge.points, 0),
              category: (challenge.category as string) || "web",
              difficulty: (challenge.difficulty as string) || "easy",
              isActive: boolOrThrow(challenge.isActive, true),
              isLocked: boolOrThrow(challenge.isLocked, false),
              link: challenge.link ? (challenge.link as string) || null : null,
              flag: challenge.flag ? (challenge.flag as string) || null : null,
              multipleFlags: boolOrThrow(challenge.multipleFlags, false),
              solveExplanation: challenge.solveExplanation
                ? (challenge.solveExplanation as string) || null
                : null,
            },
            update: {
              title: challenge.title as string,
              description: challenge.description as string,
              points: numberOrThrow(challenge.points, 0),
              category: (challenge.category as string) || "web",
              difficulty: (challenge.difficulty as string) || "easy",
              isActive: boolOrThrow(challenge.isActive, true),
              isLocked: boolOrThrow(challenge.isLocked, false),
              link: challenge.link ? (challenge.link as string) || null : null,
              flag: challenge.flag ? (challenge.flag as string) || null : null,
              multipleFlags: boolOrThrow(challenge.multipleFlags, false),
              solveExplanation: challenge.solveExplanation
                ? (challenge.solveExplanation as string) || null
                : null,
            },
          });
        }
        imported.challenges = challenges;

        // --- Challenge child relations (hints, flags, unlock conditions) ---
        for (const challenge of challenges) {
          const cid = challenge.id as string;

          if (Array.isArray(challenge.hints)) {
            for (const h of challenge.hints) {
              if (!isRecord(h)) {
                throw new ValidationError("hint must be an object");
              }
              const hint = h as Rec;
              // Validate every child fully before any write (no silent skip).
              if (!isStrId(hint.id)) {
                throw new ValidationError("hint.id must be a non-empty string");
              }
              if (typeof hint.content !== "string") {
                throw new ValidationError("hint.content must be a string");
              }
              const cost = numberOrThrow(hint.cost, 0);
              await tx.hint.upsert({
                where: { id: hint.id as string },
                create: {
                  id: hint.id as string,
                  challengeId: cid,
                  content: hint.content,
                  cost,
                },
                update: {
                  challengeId: cid,
                  content: hint.content,
                  cost,
                },
              });
            }
          }

          if (Array.isArray(challenge.flags)) {
            for (const f of challenge.flags) {
              if (!isRecord(f)) {
                throw new ValidationError("flag must be an object");
              }
              const flag = f as Rec;
              if (!isStrId(flag.id)) {
                throw new ValidationError(
                  "challengeFlag.id must be a non-empty string",
                );
              }
              if (typeof flag.flag !== "string" || flag.flag.length === 0) {
                throw new ValidationError(
                  "challengeFlag.flag must be a non-empty string",
                );
              }
              const flagPoints = numberOrThrow(flag.points, 0);
              await tx.challengeFlag.upsert({
                where: { id: flag.id as string },
                create: {
                  id: flag.id as string,
                  challengeId: cid,
                  flag: flag.flag,
                  points: flagPoints,
                },
                update: {
                  challengeId: cid,
                  flag: flag.flag,
                  points: flagPoints,
                },
              });
            }
          }

          if (Array.isArray(challenge.unlockConditions)) {
            for (const uc of challenge.unlockConditions) {
              if (!isRecord(uc)) {
                throw new ValidationError("unlockCondition must be an object");
              }
              const cond = uc as Rec;
              if (!isStrId(cond.id)) {
                throw new ValidationError(
                  "unlockCondition.id must be a non-empty string",
                );
              }
              if (
                cond.type !== "CHALLENGE_SOLVED" &&
                cond.type !== "TIME_REMAINDER"
              ) {
                throw new ValidationError(
                  "unlockCondition.type must be CHALLENGE_SOLVED or TIME_REMAINDER",
                );
              }
              // requiredChallengeId: null/undefined -> null; non-empty string -> must exist.
              let requiredChallengeId: string | null;
              if (
                cond.requiredChallengeId === null ||
                cond.requiredChallengeId === undefined
              ) {
                requiredChallengeId = null;
              } else if (typeof cond.requiredChallengeId === "string") {
                if (cond.requiredChallengeId.trim() === "") {
                  throw new ValidationError(
                    "unlockCondition.requiredChallengeId must be a non-empty string or null",
                  );
                }
                requiredChallengeId = cond.requiredChallengeId;
              } else {
                throw new ValidationError(
                  "unlockCondition.requiredChallengeId must be a string or null",
                );
              }

              // Validate immediately before writing this upsert (no second pass).
              if (requiredChallengeId !== null) {
                const ref = await tx.challenge.findUnique({
                  where: { id: requiredChallengeId },
                  select: { id: true },
                });
                if (!ref) {
                  throw new ValidationError(
                    `unlockCondition.requiredChallengeId "${requiredChallengeId}" does not refer to an existing or imported challenge`,
                  );
                }
              }

              // timeThresholdSeconds: null/undefined -> null; finite number -> keep.
              let timeThresholdSeconds: number | null;
              if (
                cond.timeThresholdSeconds === null ||
                cond.timeThresholdSeconds === undefined
              ) {
                timeThresholdSeconds = null;
              } else {
                timeThresholdSeconds = numberOrThrow(
                  cond.timeThresholdSeconds,
                  0,
                );
              }

              await tx.unlockCondition.upsert({
                where: { id: cond.id as string },
                create: {
                  id: cond.id as string,
                  challengeId: cid,
                  type: cond.type as "CHALLENGE_SOLVED" | "TIME_REMAINDER",
                  requiredChallengeId,
                  timeThresholdSeconds,
                },
                update: {
                  challengeId: cid,
                  type: cond.type as "CHALLENGE_SOLVED" | "TIME_REMAINDER",
                  requiredChallengeId,
                  timeThresholdSeconds,
                },
              });
            }
          }
        }
      }

      if (Array.isArray(announcements)) {
        // Announcements are not user-referenced and have no FK restrictions
        // pointing into them; replacing the set is safe and matches prior
        // behaviour.
        await tx.announcement.deleteMany({});
        imported.announcements = await Promise.all(
          announcements.map((announcement: Rec) =>
            tx.announcement.create({
              data: {
                title: announcement.title as string,
                content: announcement.content as string,
              },
            }),
          ),
        );
      }

      if (gameConfig) {
        // Single-row config: replace the existing row.
        await tx.gameConfig.deleteMany({});
        imported.gameConfig = await tx.gameConfig.create({
          data: {
            startTime: new Date(gameConfig.startTime as string),
            endTime: gameConfig.endTime
              ? new Date(gameConfig.endTime as string)
              : null,
            isActive: boolOrThrow(gameConfig.isActive, true),
          },
        });
      }

      return imported;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: "Invalid import payload" },
        { status: 400 },
      );
    }
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Unique constraint violation (name or code already taken)" },
        { status: 409 },
      );
    }
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: "Invalid reference in import payload" },
        { status: 400 },
      );
    }
    console.error("Error importing data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
