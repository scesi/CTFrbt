vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { describe, expect, it, vi } from "vitest";
import { mockNoSession, mockSession, createUser } from "../helpers/factories";
import {
  GET as usersGet,
  POST as usersPost,
} from "@/app/api/admin/users/route";
import {
  PATCH as userPatch,
  DELETE as userDelete,
} from "@/app/api/admin/users/[id]/route";
import { GET as teamsGet } from "@/app/api/admin/teams/route";
import {
  PATCH as teamPatch,
  DELETE as teamDelete,
} from "@/app/api/admin/teams/[id]/route";
import {
  GET as challengesGet,
  POST as challengesPost,
} from "@/app/api/admin/challenges/route";
import {
  PUT as challengePut,
  DELETE as challengeDelete,
} from "@/app/api/admin/challenges/[id]/route";
import {
  GET as announcementsGet,
  POST as announcementsPost,
} from "@/app/api/admin/announcements/route";
import { DELETE as announcementDelete } from "@/app/api/admin/announcements/[id]/route";
import {
  GET as rulesGet,
  POST as rulesPost,
} from "@/app/api/admin/rules/route";
import { GET as logsGet } from "@/app/api/admin/logs/route";
import { GET as submissionsGet } from "@/app/api/admin/submissions/route";
import { GET as gameGet, POST as gamePost } from "@/app/api/admin/game/route";
import {
  GET as exportGet,
  POST as exportPost,
} from "@/app/api/admin/export/route";

const jsonRequest = (body: unknown = {}, method = "POST") =>
  new Request("http://localhost/api/admin", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const calls: Array<[string, () => Promise<Response>]> = [
  ["GET /api/admin/users", () => usersGet()],
  ["POST /api/admin/users", () => usersPost(jsonRequest({}))],
  [
    "PATCH /api/admin/users/[id]",
    () => userPatch(jsonRequest({}), params("id")),
  ],
  [
    "DELETE /api/admin/users/[id]",
    () => userDelete(jsonRequest({}, "DELETE"), params("id")),
  ],
  ["GET /api/admin/teams", () => teamsGet()],
  [
    "PATCH /api/admin/teams/[id]",
    () => teamPatch(jsonRequest({}), params("id")),
  ],
  [
    "DELETE /api/admin/teams/[id]",
    () => teamDelete(jsonRequest({}, "DELETE"), params("id")),
  ],
  ["GET /api/admin/challenges", () => challengesGet()],
  ["POST /api/admin/challenges", () => challengesPost(jsonRequest({}))],
  [
    "PUT /api/admin/challenges/[id]",
    () => challengePut(jsonRequest({}), params("id")),
  ],
  [
    "DELETE /api/admin/challenges/[id]",
    () => challengeDelete(jsonRequest({}, "DELETE"), params("id")),
  ],
  ["GET /api/admin/announcements", () => announcementsGet()],
  ["POST /api/admin/announcements", () => announcementsPost(jsonRequest({}))],
  [
    "DELETE /api/admin/announcements/[id]",
    () => announcementDelete(jsonRequest({}, "DELETE"), params("id")),
  ],
  ["GET /api/admin/rules", () => rulesGet()],
  ["POST /api/admin/rules", () => rulesPost(jsonRequest({}))],
  ["GET /api/admin/logs", () => logsGet()],
  ["GET /api/admin/submissions", () => submissionsGet()],
  ["GET /api/admin/game", () => gameGet()],
  ["POST /api/admin/game", () => gamePost(jsonRequest({}))],
  ["GET /api/admin/export", () => exportGet()],
  ["POST /api/admin/export", () => exportPost(jsonRequest({}))],
];

describe("admin authorization", () => {
  it.each(calls)("%s returns 403 without a session", async (name, call) => {
    mockNoSession();
    const res = await call();
    expect(res.status, `${name} should be forbidden`).toBe(403);
  });

  it("returns 403 for a non-admin session on every endpoint", async () => {
    const user = await createUser();
    mockSession({ id: user.id, isAdmin: false });

    for (const [name, call] of calls) {
      const res = await call();
      expect(res.status, `${name} should be forbidden`).toBe(403);
    }
  });

  it("returns 401/403 when the session user is undefined", async () => {
    mockNoSession();
    const res = await usersGet();
    expect(res.status).toBe(403);
  });
});
