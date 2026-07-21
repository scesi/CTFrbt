import { describe, it, expect } from "vitest";
import { prisma } from "../helpers/db";
import {
  createChallenge,
  createMultiFlagChallenge,
  createTeam,
  createUser,
} from "../helpers/factories";

// Smoke test for the integration project: proves the test DB connects,
// migrations are applied, truncation runs between tests, and factories work.
describe("test infra — integration project", () => {
  it("connects to the test DB and persists a user", async () => {
    const user = await createUser({ alias: "alice_smoke" });
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.alias).toBe("alice_smoke");
  });

  it("starts from a clean slate (previous test was truncated)", async () => {
    expect(await prisma.user.count()).toBe(0);
  });

  it("factories build teams and single/multi-flag challenges", async () => {
    const team = await createTeam();
    const single = await createChallenge();
    const multi = await createMultiFlagChallenge();

    expect(team.code).toHaveLength(12);
    expect(single.flag).toBe("flag{test}");
    expect(single.multipleFlags).toBe(false);
    expect(multi.multipleFlags).toBe(true);
    expect(multi.flags).toHaveLength(2);
  });
});
