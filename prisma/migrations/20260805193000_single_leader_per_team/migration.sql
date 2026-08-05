-- Enforce a single team leader per team at the database level.
-- Prisma cannot model a partial unique index in the schema (no "where"
-- clause), so this is added as a raw migration. It allows rows with
-- isTeamLeader = false (or no team) to share the same teamId freely,
-- but the team leader flag can only be true for one member per team.
CREATE UNIQUE INDEX "user_single_leader_per_team"
  ON "User"("teamId")
  WHERE "isTeamLeader" = true;