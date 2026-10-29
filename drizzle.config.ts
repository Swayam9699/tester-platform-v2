import { defineConfig } from "drizzle-kit";

/**
 * Used by `npm run drizzle:migrate` (run before every build) and `drizzle:generate`. Local dev migrates PGlite on boot.
 * Prefers POSTGRES_URL_NON_POOLING, the session connection set by Vercel's Supabase integration: migrations are
 * multi-statement transactions. Same clean-up as databaseUrl() in src/lib/config.ts: only sslmode is kept from the
 * integration's options, since postgres.js would forward the others to the server as startup parameters.
 */
function migrationUrl() {
  const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) return "";
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) if (key !== "sslmode") url.searchParams.delete(key);
  return url.toString();
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/drizzle",
  dialect: "postgresql",
  dbCredentials: { url: migrationUrl() },
});
