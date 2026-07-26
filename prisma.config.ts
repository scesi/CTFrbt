import { config as loadEnv } from "dotenv";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Having a prisma.config.ts disables Prisma's automatic .env loading, so load
// it here for CLI commands (migrate, seed, studio). `quiet` silences dotenv's
// promo output; already-set vars (e.g. the test DATABASE_URL) are not
// overridden, so `pnpm test` still targets the test database.
loadEnv({ quiet: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
