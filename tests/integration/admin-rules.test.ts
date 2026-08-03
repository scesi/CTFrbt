vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/rules/route";
import { prisma } from "../helpers/db";
import { createAdminUser, mockSession } from "../helpers/factories";

const json = (body: unknown, method = "POST") =>
  new Request("http://localhost/api/admin/rules", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("admin rules", () => {
  it("GET returns an empty string when no rules are configured", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rules).toBe("");
  });

  it("POST creates the rules key on first save", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ rules: "## Rules\nNo cheating." }));
    expect(res.status).toBe(200);

    const config = await prisma.siteConfig.findUnique({
      where: { key: "rules" },
    });
    expect(config?.value).toBe("## Rules\nNo cheating.");
  });

  it("POST updates existing rules", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await POST(json({ rules: "v1" }));
    const res = await POST(json({ rules: "v2" }));
    expect(res.status).toBe(200);

    const config = await prisma.siteConfig.findUnique({
      where: { key: "rules" },
    });
    expect(config?.value).toBe("v2");
    expect(await prisma.siteConfig.count({ where: { key: "rules" } })).toBe(1);
  });

  it("POST rejects a non-string rules payload", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ rules: 42 }));
    expect(res.status).toBe(400);
  });
});
