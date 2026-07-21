import { afterAll, beforeEach } from "vitest";
import { prisma, resetDb } from "../helpers/db";

// Clean slate before each test so suites are order-independent.
beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
