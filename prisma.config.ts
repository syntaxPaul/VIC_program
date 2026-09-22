import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7's CLI no longer loads .env automatically.
loadEnv({ path: path.join(process.cwd(), ".env"), quiet: true });

/**
 * `prisma generate` does not touch the database, and runs during the Docker
 * build where no DATABASE_URL exists. Commands that DO need a connection
 * (migrate, db push) fail with their own clear error, so an empty string here
 * is safe and keeps the build from needing production credentials.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
