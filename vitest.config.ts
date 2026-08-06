import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: ".env.test", quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "test-secret",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      LIBPQ_TEST_URL_ENCODED:
        process.env.LIBPQ_TEST_URL_ENCODED ??
        "postgresql://demo_user:Pa%26ss%25w%40rd@db.local:5432/demo_db",
      LIBPQ_TEST_URL_RAW:
        process.env.LIBPQ_TEST_URL_RAW ??
        "postgresql://demo_user:Pa&ss%w@db.local:5432/demo_db",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/setup/global-setup.ts"],
          setupFiles: ["tests/setup/integration-setup.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
