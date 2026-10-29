// Runs before `next build`: applies the SQL migrations in drizzle/ when a database is configured, so a Vercel
// deploy (with the Supabase integration) creates and updates the tables by itself. Without a database, e.g. a
// local demo build, it does nothing.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Prefer the integration's session connection: migrations are multi-statement transactions.
const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!raw) {
  console.log("migrate: no database configured, skipping");
  process.exit(0);
}

// Same clean-up as databaseUrl() in src/lib/config.ts: keep only sslmode from the integration's options.
const url = new URL(raw);
for (const key of [...url.searchParams.keys()]) if (key !== "sslmode") url.searchParams.delete(key);

const sql = postgres(url.toString(), { prepare: false, max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  console.log("migrate: database is up to date");
} finally {
  await sql.end();
}
