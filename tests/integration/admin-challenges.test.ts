vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/challenges/route";
import { PUT, DELETE } from "@/app/api/admin/challenges/[id]/route";
import { prisma } from "../helpers/db";
import {
  createAdminUser,
  createChallenge,
  mockSession,
} from "../helpers/factories";

const json = (body: unknown, method = "POST") =>
  new Request("http://localhost/api/admin/challenges", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const validChallenge = {
  title: "My Challenge",
  description: "A description",
  points: 100,
  flag: "flag{admin}",
  category: "web",
  difficulty: "easy",
};

describe("admin challenges", () => {
  it("GET lists challenges with relations", async () => {
    const admin = await createAdminUser();
    const challenge = await createChallenge();
    mockSession(admin);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    const match = body.challenges.find(
      (c: { id: string }) => c.id === challenge.id,
    );
    expect(match).toBeDefined();
    expect(match._count?.submissions).toBe(0);
  });

  it("POST creates a single-flag challenge", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json(validChallenge));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.challenge.title).toBe("My Challenge");
    expect(body.challenge.flag).toBe("flag{admin}");

    const stored = await prisma.challenge.findUnique({
      where: { id: body.challenge.id },
    });
    expect(stored?.points).toBe(100);
  });

  it("POST creates a multi-flag challenge with sub-flags", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      json({
        ...validChallenge,
        multipleFlags: true,
        flag: undefined,
        flags: [
          { flag: "flag{a}", points: 25 },
          { flag: "flag{b}", points: 50 },
        ],
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.challenge.flags).toHaveLength(2);
  });

  it("POST rejects missing required fields", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ title: "only-title" }));
    expect(res.status).toBe(400);
  });

  it("POST rejects invalid points", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ ...validChallenge, points: -5 }));
    expect(res.status).toBe(400);
  });

  it("POST rejects a non-http link", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(
      json({ ...validChallenge, link: "javascript:alert(1)" }),
    );
    expect(res.status).toBe(400);
  });

  it("PUT updates challenge fields", async () => {
    const admin = await createAdminUser();
    const challenge = await createChallenge();
    mockSession(admin);

    const res = await PUT(
      json({ title: "Updated", points: 250 }),
      params(challenge.id),
    );
    expect(res.status).toBe(200);

    const updated = await prisma.challenge.findUnique({
      where: { id: challenge.id },
    });
    expect(updated?.title).toBe("Updated");
    expect(updated?.points).toBe(250);
  });

  it("PUT rejects invalid points", async () => {
    const admin = await createAdminUser();
    const challenge = await createChallenge();
    mockSession(admin);

    const res = await PUT(json({ points: "abc" }), params(challenge.id));
    expect(res.status).toBe(400);
  });

  it("PUT rejects a non-http link", async () => {
    const admin = await createAdminUser();
    const challenge = await createChallenge();
    mockSession(admin);

    const res = await PUT(
      json({ link: "ftp://example.com" }),
      params(challenge.id),
    );
    expect(res.status).toBe(400);
  });

  it("PUT a nonexistent challenge returns 404", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await PUT(json({ title: "X" }), params("nope"));
    expect(res.status).toBe(404);
  });

  it("DELETE removes a challenge", async () => {
    const admin = await createAdminUser();
    const challenge = await createChallenge();
    mockSession(admin);

    const res = await DELETE(json({}, "DELETE"), params(challenge.id));
    expect(res.status).toBe(200);

    const gone = await prisma.challenge.findUnique({
      where: { id: challenge.id },
    });
    expect(gone).toBeNull();
  });

  it("DELETE a nonexistent challenge returns 404", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await DELETE(json({}, "DELETE"), params("nope"));
    expect(res.status).toBe(404);
  });
});
