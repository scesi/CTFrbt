import { describe, it, expect } from "vitest";
import { isValidPoints, isValidChallengeLink } from "@/lib/validation";

// Smoke test for the unit project: no database, just proves the runner and
// the `@/` alias resolve app modules.
describe("test infra — unit project", () => {
  it("runs without a database", () => {
    expect(1 + 1).toBe(2);
  });

  it("imports app modules via the @/ alias", () => {
    expect(isValidPoints(100)).toBe(true);
    expect(isValidPoints(-1)).toBe(false);
    expect(isValidChallengeLink("https://example.com")).toBe(true);
    expect(isValidChallengeLink("javascript:alert(1)")).toBe(false);
  });
});
