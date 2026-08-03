vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/game/route";
import { prisma } from "../helpers/db";
import { createAdminUser, mockSession } from "../helpers/factories";

const json = (body: unknown, method = "POST") =>
  new Request("http://localhost/api/admin/game", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const start = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const end = new Date(Date.now() + 60 * 60 * 1000).toISOString();

describe("admin game config", () => {
  it("POST rejects a missing startTime", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({}));
    expect(res.status).toBe(400);
  });

  it("POST rejects an invalid date", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ startTime: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("POST rejects endTime before startTime", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      json({
        startTime: start,
        endTime: new Date(Date.now() - 7200e3).toISOString(),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST creates config and GET reads it back", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ startTime: start, endTime: end }));
    expect(res.status).toBe(200);

    const read = await GET();
    const body = await read.json();
    expect(body.config?.startTime).not.toBeNull();
  });

  it("POST upserts into a single row", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await POST(json({ startTime: start, endTime: end }));
    await POST(
      json({
        startTime: end,
        endTime: new Date(Date.now() + 7200e3).toISOString(),
      }),
    );

    expect(await prisma.gameConfig.count()).toBe(1);
  });

  it("POST preserves isActive: false when explicitly sent", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await POST(json({ startTime: start, endTime: end, isActive: false }));

    const config = await prisma.gameConfig.findFirst();
    expect(config?.isActive).toBe(false);
  });

  it("POST defaults isActive to true when omitted", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await POST(json({ startTime: start, endTime: end }));

    const config = await prisma.gameConfig.findFirst();
    expect(config?.isActive).toBe(true);
  });
});
