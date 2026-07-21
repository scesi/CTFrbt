import { prisma } from "@/lib/prisma";

export { prisma };

// Every table in the schema, most-dependent first is not required because
// RESTART IDENTITY CASCADE handles FK order. Kept explicit so a new model is
// a deliberate addition here.
const TABLES = [
  "TeamJoinAttempt",
  "UserSession",
  "LoginAttempt",
  "SiteConfig",
  "GameConfig",
  "ActivityLog",
  "Announcement",
  "UnlockCondition",
  "TeamHint",
  "Hint",
  "TeamPointHistory",
  "Score",
  "Submission",
  "ChallengeFile",
  "ChallengeFlag",
  "Challenge",
  "User",
  "Team",
];

/** Wipes all app tables so each test starts from a clean slate. */
export async function resetDb() {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );
}
