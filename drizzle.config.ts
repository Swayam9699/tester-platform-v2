import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Only used by `npm run db:migrate` against Supabase. Local dev migrates PGlite on boot.
  // POSTGRES_URL_NON_POOLING is the session connection set by Vercel's Supabase integration.
  dbCredentials: { url: process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || "" },
});
