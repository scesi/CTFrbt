vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/announcements/route";
import { DELETE } from "@/app/api/admin/announcements/[id]/route";
import { prisma } from "../helpers/db";
import { createAdminUser, mockSession } from "../helpers/factories";

const json = (body: unknown, method = "POST") =>
  new Request("http://localhost/api/admin/announcements", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("admin announcements", () => {
  it("POST creates an announcement", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ title: "Welcome", content: "Hello CTF!" }));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.announcement.title).toBe("Welcome");

    const stored = await prisma.announcement.findUnique({
      where: { id: body.announcement.id },
    });
    expect(stored?.content).toBe("Hello CTF!");
  });

  it("POST rejects empty title or content", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const noTitle = await POST(json({ title: "", content: "x" }));
    expect(noTitle.status).toBe(400);

    const noContent = await POST(json({ title: "x", content: "  " }));
    expect(noContent.status).toBe(400);
  });

  it("POST rejects a title longer than 120 characters", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ title: "x".repeat(121), content: "hello" }));
    expect(res.status).toBe(400);
  });

  it("POST rejects content longer than 2000 characters", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await POST(json({ title: "ok", content: "x".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("GET lists announcements newest first", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    await POST(json({ title: "First", content: "a" }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await POST(json({ title: "Second", content: "b" }));

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.announcements).toHaveLength(2);
    expect(body.announcements[0].title).toBe("Second");
  });

  it("DELETE removes an announcement", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const created = await POST(json({ title: "Temp", content: "x" }));
    const { announcement } = await created.json();

    const res = await DELETE(json({}, "DELETE"), params(announcement.id));
    expect(res.status).toBe(200);

    const gone = await prisma.announcement.findUnique({
      where: { id: announcement.id },
    });
    expect(gone).toBeNull();
  });

  it("DELETE a nonexistent announcement returns 404", async () => {
    const admin = await createAdminUser();
    mockSession(admin);

    const res = await DELETE(json({}, "DELETE"), params("nope"));
    expect(res.status).toBe(404);
  });
});
