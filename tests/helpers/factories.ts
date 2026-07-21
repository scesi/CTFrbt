import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type {
  Challenge,
  Hint,
  Team,
  User,
} from "../../prisma/generated/client";

let seq = 0;
const uniq = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

/** bcrypt cost 4 — fast for tests; production uses 12. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 4);
}

export async function createUser(
  overrides: Partial<Omit<User, "id">> = {},
): Promise<User> {
  const n = uniq();
  return prisma.user.create({
    data: {
      alias: `user_${n}`,
      name: `User ${n}`,
      password: await hashPassword("password"),
      ...overrides,
    },
  });
}

export async function createTeam(
  overrides: Partial<Omit<Team, "id">> = {},
): Promise<Team> {
  const n = uniq();
  return prisma.team.create({
    data: {
      name: `Team ${n}`,
      code: crypto.randomBytes(6).toString("hex").toUpperCase(), // 12 chars
      ...overrides,
    },
  });
}

/** User already attached to a fresh team. Returns both. */
export async function createUserWithTeam(
  userOverrides: Partial<Omit<User, "id">> = {},
): Promise<{ user: User; team: Team }> {
  const team = await createTeam();
  const user = await createUser({
    teamId: team.id,
    isTeamLeader: true,
    ...userOverrides,
  });
  return { user, team };
}

export async function createChallenge(
  overrides: Partial<Omit<Challenge, "id">> = {},
): Promise<Challenge> {
  const n = uniq();
  return prisma.challenge.create({
    data: {
      title: `Challenge ${n}`,
      description: "A test challenge.",
      points: 100,
      flag: "flag{test}",
      category: "web",
      difficulty: "easy",
      ...overrides,
    },
  });
}

export async function createMultiFlagChallenge(
  flags: { flag: string; points: number }[] = [
    { flag: "flag{a}", points: 25 },
    { flag: "flag{b}", points: 50 },
  ],
  overrides: Partial<Omit<Challenge, "id">> = {},
): Promise<Challenge & { flags: { id: string; flag: string }[] }> {
  const n = uniq();
  return prisma.challenge.create({
    data: {
      title: `Multi ${n}`,
      description: "A multi-flag test challenge.",
      points: 0,
      multipleFlags: true,
      category: "misc",
      difficulty: "medium",
      flags: { create: flags },
      ...overrides,
    },
    include: { flags: true },
  });
}

export async function createHint(
  challengeId: string,
  overrides: Partial<Omit<Hint, "id" | "challengeId">> = {},
): Promise<Hint> {
  return prisma.hint.create({
    data: { challengeId, content: "A test hint.", cost: 0, ...overrides },
  });
}

/** Creates the single active GameConfig row the game-window logic reads. */
export async function setGameConfig(
  startTime: Date,
  endTime: Date | null = null,
  isActive = true,
) {
  return prisma.gameConfig.create({
    data: { startTime, endTime, isActive },
  });
}
